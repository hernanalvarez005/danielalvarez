-- Phase 4: field execution / applicator. Digitizes the paper talonario:
-- start application, log tank loads, finish application. This is
-- strictly "what actually happened" -- it never writes back into
-- spray_orders / spray_order_products ("what should happen", Phase 3).
--
-- Reconciliation (planned vs. actual) is explicitly Phase 5 and is not
-- implemented here.

-- ---------------------------------------------------------------------------
-- spray_executions -- 1:1 with a work_order. Created only when the
-- applicator actually starts the job (not at work_order creation time).
-- ---------------------------------------------------------------------------

create table public.spray_executions (
  work_order_id uuid primary key references public.work_orders (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  started_at timestamptz,
  started_by uuid references auth.users (id),
  finished_at timestamptz,
  finished_by uuid references auth.users (id),
  actual_area_ha numeric check (actual_area_ha is null or actual_area_ha > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id, organization_id)
);

comment on table public.spray_executions is
  'What actually happened for a spraying work order. Mutated exclusively by start_spray_application()/finish_spray_application() -- no direct insert/update policy exists for this table.';

create trigger set_updated_at
  before update on public.spray_executions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-work-order load numbering, race-condition-safe -- same mechanism as
-- Phase 3's order_number_counters/next_order_number, scoped to a work
-- order instead of an organization.
-- ---------------------------------------------------------------------------

create table public.spray_load_counters (
  work_order_id uuid primary key references public.work_orders (id) on delete cascade,
  last_number integer not null default 0
);

comment on table public.spray_load_counters is
  'One row per work order; last_number is only ever touched by next_load_number(). Not exposed via the API -- RLS denies all direct access.';

alter table public.spray_load_counters enable row level security;
-- Intentionally no policies -- only next_load_number() (SECURITY DEFINER)
-- touches this table directly.

create function public.next_load_number(p_work_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  insert into public.spray_load_counters (work_order_id, last_number)
  values (p_work_order_id, 1)
  on conflict (work_order_id)
    do update set last_number = public.spray_load_counters.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- spray_loads -- each tank load registered during application.
-- ---------------------------------------------------------------------------

create table public.spray_loads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null,
  load_number integer not null,
  water_liters numeric not null check (water_liters > 0),
  notes text,
  -- Idempotency key: the client generates one uuid per logical "guardar
  -- carga" attempt and reuses it across retries of the same submission.
  -- register_spray_load() checks this before inserting, so a retried
  -- request after a timeout returns the already-committed load instead
  -- of creating a duplicate.
  client_request_id uuid not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id, load_number),
  unique (work_order_id, client_request_id),
  unique (id, organization_id),
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id)
);

create index spray_loads_organization_id_idx on public.spray_loads (organization_id);
create index spray_loads_work_order_id_idx on public.spray_loads (work_order_id);

create function public.set_load_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.load_number is null then
    new.load_number = public.next_load_number(new.work_order_id);
  end if;
  return new;
end;
$$;

create trigger set_load_number
  before insert on public.spray_loads
  for each row execute function public.set_load_number();

create trigger set_updated_at
  before update on public.spray_loads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- spray_load_products -- real products used in a given load. Whether a
-- product "wasn't in the recipe" is derived in the app by comparing
-- product_id against spray_order_products -- not stored here, so it can
-- never drift from the (now-locked) recipe it's being compared against.
-- ---------------------------------------------------------------------------

create table public.spray_load_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  spray_load_id uuid not null,
  product_id uuid not null,
  quantity_value numeric not null check (quantity_value > 0),
  -- Deliberately its own vocabulary (raw quantity units, not per-ha
  -- doses like spray_order_products.dose_unit). Volume and mass are
  -- never mixed for the same product.
  quantity_unit text not null check (quantity_unit in ('l', 'ml', 'cc', 'kg', 'g')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spray_load_id, product_id),
  foreign key (spray_load_id, organization_id) references public.spray_loads (id, organization_id),
  foreign key (product_id, organization_id) references public.products (id, organization_id)
);

create index spray_load_products_organization_id_idx on public.spray_load_products (organization_id);
create index spray_load_products_spray_load_id_idx on public.spray_load_products (spray_load_id);

create trigger set_updated_at
  before update on public.spray_load_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shared authorization helper: who may view/manage the execution of a
-- given work order. Admin/engineer of the org, or the applicator it's
-- assigned to (matched via applicators.profile_id = auth.uid(), never by
-- trusting a client-supplied applicator id). Reused by every RLS policy
-- below and inside the start/finish RPCs, so the rule lives in one place.
-- ---------------------------------------------------------------------------

create function public.can_manage_spray_execution(p_work_order_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.work_orders wo
    where wo.id = p_work_order_id
      and (
        public.is_org_engineer_or_admin(wo.organization_id)
        or exists (
          select 1 from public.applicators a
          where a.id = wo.applicator_id
            and a.organization_id = wo.organization_id
            and a.profile_id = auth.uid()
            and a.active = true
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- work_orders: restrict applicator visibility to their own assigned
-- orders. Admin/engineer keep seeing everything. This single change
-- cascades to spray_orders/spray_order_products without touching their
-- policies: those already gate via `exists (select 1 from work_orders wo
-- where ...)` against the real table (not through a SECURITY DEFINER
-- function), so work_orders' own RLS applies inside that subquery too.
-- ---------------------------------------------------------------------------

drop policy "Members can view work orders" on public.work_orders;

create policy "Admins and engineers can view all work orders" on public.work_orders for select
  to authenticated using (public.is_org_engineer_or_admin(organization_id));

create policy "Applicators can view their assigned work orders" on public.work_orders for select
  to authenticated using (
    exists (
      select 1 from public.applicators a
      where a.id = work_orders.applicator_id
        and a.organization_id = work_orders.organization_id
        and a.profile_id = auth.uid()
        and a.active = true
    )
  );

-- ---------------------------------------------------------------------------
-- Row Level Security -- spray_executions, spray_loads, spray_load_products
-- ---------------------------------------------------------------------------

alter table public.spray_executions enable row level security;
alter table public.spray_loads enable row level security;
alter table public.spray_load_products enable row level security;

-- spray_executions: view-only via RLS. Insert/update happens exclusively
-- inside start_spray_application()/finish_spray_application() (SECURITY
-- DEFINER) -- there is no insert/update policy, so a direct write from
-- the API is always denied regardless of role.
create policy "Authorized users can view spray executions" on public.spray_executions for select
  to authenticated using (public.can_manage_spray_execution(work_order_id));

-- spray_loads: visible any time to whoever can manage the execution
-- (including after finishing, so the applicator's and backoffice's
-- summary screens keep working). Writes only while the work order is
-- in_progress -- this is what register_spray_load()/update_spray_load()
-- (SECURITY INVOKER) rely on, and it's also enforced for the DELETE
-- flow, which is a plain client-side delete.
create policy "Authorized users can view spray loads" on public.spray_loads for select
  to authenticated using (public.can_manage_spray_execution(work_order_id));

create policy "Authorized users can insert spray loads while in progress" on public.spray_loads for insert
  to authenticated with check (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status = 'in_progress'
    )
  );

create policy "Authorized users can update spray loads while in progress" on public.spray_loads for update
  to authenticated using (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status = 'in_progress'
    )
  )
  with check (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status = 'in_progress'
    )
  );

create policy "Authorized users can delete spray loads while in progress" on public.spray_loads for delete
  to authenticated using (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status = 'in_progress'
    )
  );

-- spray_load_products: same shape as spray_order_products in Phase 3,
-- gated through its parent spray_load's work order.
create policy "Authorized users can view spray load products" on public.spray_load_products for select
  to authenticated using (
    exists (
      select 1 from public.spray_loads sl
      where sl.id = spray_load_products.spray_load_id
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

create policy "Authorized users can insert spray load products while in progress" on public.spray_load_products for insert
  to authenticated with check (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status = 'in_progress'
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

create policy "Authorized users can update spray load products while in progress" on public.spray_load_products for update
  to authenticated using (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status = 'in_progress'
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  )
  with check (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status = 'in_progress'
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

create policy "Authorized users can delete spray load products while in progress" on public.spray_load_products for delete
  to authenticated using (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status = 'in_progress'
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Planning lock: update_spray_work_order (Phase 3) must now refuse to
-- touch a work order once execution has started. Enforced in the
-- database, not just by hiding the "Editar" button.
-- ---------------------------------------------------------------------------

create or replace function public.update_spray_work_order(
  p_work_order_id uuid,
  p_customer_id uuid,
  p_field_id uuid,
  p_plot_id uuid,
  p_campaign_id uuid,
  p_crop_id uuid,
  p_applicator_id uuid,
  p_scheduled_date date,
  p_planned_area_ha numeric,
  p_notes text,
  p_status text,
  p_application_method text,
  p_target_spray_volume_per_ha numeric,
  p_products jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_current_status text;
  v_product jsonb;
begin
  select status into v_current_status from public.work_orders where id = p_work_order_id;

  if v_current_status is null then
    raise exception 'Work order not found or not authorized';
  end if;

  if v_current_status not in ('draft', 'pending') then
    raise exception 'No se puede editar la planificación de una orden en estado %', v_current_status;
  end if;

  if p_status not in ('draft', 'pending') then
    raise exception 'Invalid status for this transition: %', p_status;
  end if;

  update public.work_orders set
    customer_id = p_customer_id,
    field_id = p_field_id,
    plot_id = p_plot_id,
    campaign_id = p_campaign_id,
    crop_id = p_crop_id,
    applicator_id = p_applicator_id,
    scheduled_date = p_scheduled_date,
    planned_area_ha = p_planned_area_ha,
    notes = p_notes,
    status = p_status
  where id = p_work_order_id
  returning organization_id into v_organization_id;

  if not found then
    raise exception 'Work order not found or not authorized';
  end if;

  update public.spray_orders set
    application_method = p_application_method,
    target_spray_volume_per_ha = p_target_spray_volume_per_ha
  where work_order_id = p_work_order_id;

  if not found then
    raise exception 'Spray order not found or not authorized';
  end if;

  delete from public.spray_order_products where work_order_id = p_work_order_id;

  for v_product in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb))
  loop
    insert into public.spray_order_products (
      organization_id, work_order_id, product_id, dose_value, dose_unit, sort_order
    ) values (
      v_organization_id,
      p_work_order_id,
      (v_product ->> 'product_id')::uuid,
      (v_product ->> 'dose_value')::numeric,
      v_product ->> 'dose_unit',
      coalesce((v_product ->> 'sort_order')::int, 0)
    );
  end loop;

  return p_work_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_spray_application / finish_spray_application -- SECURITY DEFINER,
-- deliberately not INVOKER (unlike every other RPC in this project).
--
-- These are the *only* functions that can move work_orders.status from
-- pending onward, and they take no planning fields as parameters --
-- there is no column for a caller to smuggle a planning change through.
-- Applicators are never granted a direct UPDATE policy on work_orders;
-- these two narrow functions are the sole door.
--
-- The status transition itself is done as `update ... where status =
-- 'pending'` (not a prior SELECT followed by a separate UPDATE), so the
-- row lock and the precondition check happen atomically -- two
-- concurrent taps of "Iniciar aplicación" can't both succeed.
-- ---------------------------------------------------------------------------

create function public.start_spray_application(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if not public.can_manage_spray_execution(p_work_order_id) then
    raise exception 'Not authorized to start this work order';
  end if;

  update public.work_orders
  set status = 'in_progress'
  where id = p_work_order_id and status = 'pending'
  returning organization_id into v_organization_id;

  if not found then
    raise exception 'Only a pending work order can be started (it may already be in progress, finished, or cancelled)';
  end if;

  insert into public.spray_executions (work_order_id, organization_id, started_at, started_by)
  values (p_work_order_id, v_organization_id, now(), auth.uid());

  return p_work_order_id;
end;
$$;

grant execute on function public.start_spray_application to authenticated;

create function public.finish_spray_application(
  p_work_order_id uuid,
  p_actual_area_ha numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_spray_execution(p_work_order_id) then
    raise exception 'Not authorized to finish this work order';
  end if;

  if p_actual_area_ha is null or p_actual_area_ha <= 0 then
    raise exception 'actual_area_ha must be greater than 0';
  end if;

  if not exists (select 1 from public.spray_loads where work_order_id = p_work_order_id) then
    raise exception 'Debe registrar al menos una carga antes de finalizar';
  end if;

  update public.work_orders
  set status = 'pending_review'
  where id = p_work_order_id and status = 'in_progress';

  if not found then
    raise exception 'Only a work order in progress can be finished';
  end if;

  update public.spray_executions
  set actual_area_ha = p_actual_area_ha,
      notes = p_notes,
      finished_at = now(),
      finished_by = auth.uid()
  where work_order_id = p_work_order_id;

  if not found then
    raise exception 'Spray execution not found';
  end if;

  return p_work_order_id;
end;
$$;

grant execute on function public.finish_spray_application to authenticated;

-- ---------------------------------------------------------------------------
-- register_spray_load / update_spray_load -- SECURITY INVOKER (the
-- default here, like Phase 3's create/update_spray_work_order): every
-- inner statement runs under RLS as the real calling user, so the
-- "in_progress + authorized" gate lives once, in the RLS policies above,
-- not duplicated in these function bodies.
-- ---------------------------------------------------------------------------

create function public.register_spray_load(
  p_work_order_id uuid,
  p_client_request_id uuid,
  p_water_liters numeric,
  p_notes text,
  p_products jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_load_id uuid;
  v_product jsonb;
begin
  -- Idempotent replay: a load already committed for this exact
  -- (work_order_id, client_request_id) means an earlier attempt
  -- succeeded but the client didn't see the response. Return it as-is
  -- instead of inserting a duplicate.
  select id into v_load_id
  from public.spray_loads
  where work_order_id = p_work_order_id and client_request_id = p_client_request_id;

  if v_load_id is not null then
    return v_load_id;
  end if;

  select organization_id into v_organization_id
  from public.organization_members
  where user_id = auth.uid() and active = true
  limit 1;

  if v_organization_id is null then
    raise exception 'No active organization membership for current user';
  end if;

  insert into public.spray_loads (
    organization_id, work_order_id, water_liters, notes, client_request_id, recorded_by
  ) values (
    v_organization_id, p_work_order_id, p_water_liters, p_notes, p_client_request_id, auth.uid()
  )
  returning id into v_load_id;

  for v_product in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb))
  loop
    insert into public.spray_load_products (
      organization_id, spray_load_id, product_id, quantity_value, quantity_unit
    ) values (
      v_organization_id,
      v_load_id,
      (v_product ->> 'product_id')::uuid,
      (v_product ->> 'quantity_value')::numeric,
      v_product ->> 'quantity_unit'
    );
  end loop;

  return v_load_id;
end;
$$;

grant execute on function public.register_spray_load to authenticated;

create function public.update_spray_load(
  p_spray_load_id uuid,
  p_water_liters numeric,
  p_notes text,
  p_products jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_product jsonb;
begin
  update public.spray_loads set
    water_liters = p_water_liters,
    notes = p_notes
  where id = p_spray_load_id
  returning organization_id into v_organization_id;

  if not found then
    raise exception 'Spray load not found or not authorized';
  end if;

  delete from public.spray_load_products where spray_load_id = p_spray_load_id;

  for v_product in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb))
  loop
    insert into public.spray_load_products (
      organization_id, spray_load_id, product_id, quantity_value, quantity_unit
    ) values (
      v_organization_id,
      p_spray_load_id,
      (v_product ->> 'product_id')::uuid,
      (v_product ->> 'quantity_value')::numeric,
      v_product ->> 'quantity_unit'
    );
  end loop;

  return p_spray_load_id;
end;
$$;

grant execute on function public.update_spray_load to authenticated;
