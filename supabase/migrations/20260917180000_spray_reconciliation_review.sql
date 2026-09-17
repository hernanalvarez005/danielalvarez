-- Phase 5: automatic reconciliation (planned vs. actual, computed on the
-- fly -- nothing here is persisted) plus the engineer's review flow.
--
-- New status: 'observed'. Full status vocabulary and its allowed
-- transitions (enforced by the RPCs below, not just by this CHECK):
--   draft -> pending -> in_progress -> pending_review -> completed
--                                                      -> observed -> pending_review (loop)
--   * -> cancelled

alter table public.work_orders drop constraint work_orders_status_check;
alter table public.work_orders add constraint work_orders_status_check
  check (status in ('draft', 'pending', 'in_progress', 'pending_review', 'completed', 'cancelled', 'observed'));

-- ---------------------------------------------------------------------------
-- spray_reviews -- immutable history of engineer decisions AND of an
-- applicator resending an observed application back to review. Putting
-- "resent" in the same table (rather than a parallel one just for that
-- single event) is what makes the unified history timeline in the UI
-- ("Observada por Juan... / Corrección enviada por Pedro... / Aprobada
-- por Juan...") a single ordered query instead of a union across tables.
-- No update/delete policy anywhere -- past decisions are never edited.
-- ---------------------------------------------------------------------------

create table public.spray_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null,
  decision text not null check (decision in ('approved', 'observed', 'resent')),
  -- Required by the app for 'observed' (see review_spray_application),
  -- not enforced here at the column level since 'resent' has no notes.
  notes text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id)
);

comment on table public.spray_reviews is
  'Immutable history: engineer approve/observe decisions and applicator resend-to-review events. Never updated or deleted.';

create index spray_reviews_work_order_id_idx on public.spray_reviews (work_order_id, reviewed_at);

alter table public.spray_reviews enable row level security;

-- Visibility cascades from work_orders' own RLS (admin/engineer see
-- every order in their org, applicator only their assigned ones) --
-- same composability already relied on for spray_orders/spray_order_products.
create policy "Authorized users can view reviews" on public.spray_reviews for select
  to authenticated using (
    exists (select 1 from public.work_orders wo where wo.id = spray_reviews.work_order_id)
  );

-- Only engineers/admins may write an 'approved'/'observed' decision here
-- directly (used by review_spray_application, SECURITY INVOKER). The
-- applicator's 'resent' row is written by resend_to_review, which is
-- SECURITY DEFINER and so bypasses this policy on purpose -- there is no
-- INSERT policy for applicators at all, they have no direct table access.
create policy "Engineers and admins can create review decisions" on public.spray_reviews for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- spray_reconciliation_settings -- per-organization warning thresholds.
-- Nullable columns: null means "no tolerance configured", not zero --
-- the UI must show "Sin comparación posible", never fabricate a
-- correct/incorrect judgment. The 5 default below is seeded for UX on
-- existing orgs and is an *operational* classification threshold, not
-- an agronomic recommendation -- it only decides when the UI flags
-- something as worth a human look, never whether a dose is safe.
-- ---------------------------------------------------------------------------

create table public.spray_reconciliation_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  product_warning_percent numeric check (product_warning_percent is null or product_warning_percent >= 0),
  area_warning_percent numeric check (area_warning_percent is null or area_warning_percent >= 0),
  spray_volume_warning_percent numeric check (spray_volume_warning_percent is null or spray_volume_warning_percent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.spray_reconciliation_settings is
  'Operational warning thresholds for reconciliation classification (NOT agronomic guidance). A null column means that dimension has no configured tolerance.';

create trigger set_updated_at
  before update on public.spray_reconciliation_settings
  for each row execute function public.set_updated_at();

alter table public.spray_reconciliation_settings enable row level security;

create policy "Members can view reconciliation settings" on public.spray_reconciliation_settings for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create reconciliation settings" on public.spray_reconciliation_settings for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update reconciliation settings" on public.spray_reconciliation_settings for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

-- Seed a conservative default for every existing organization so the UI
-- has something to classify against out of the box. See the table
-- comment above: this is a starting operational threshold, not a
-- recommendation -- any org can change or null it out later.
insert into public.spray_reconciliation_settings (organization_id, product_warning_percent, area_warning_percent, spray_volume_warning_percent)
select id, 5, 5, 5 from public.organizations
on conflict (organization_id) do nothing;

-- ---------------------------------------------------------------------------
-- spray_execution_change_log -- minimal audit trail. Only written by the
-- execution-mutating RPCs below, and only when the work order's status
-- is 'observed' at the time of the call (never during plain in_progress
-- registration -- see each RPC for the guard). Read-only via RLS,
-- written by the RPCs themselves (SECURITY INVOKER, so the INSERT
-- policy below is what actually authorizes it).
-- ---------------------------------------------------------------------------

create table public.spray_execution_change_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null,
  entity_type text not null check (entity_type in ('spray_execution', 'spray_load')),
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb,
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id)
);

comment on table public.spray_execution_change_log is
  'Audit trail for execution data corrected after an application was observed. A spray_load entry before/after includes its product lines as a nested snapshot, since a load and its products are always edited together.';

create index spray_execution_change_log_work_order_id_idx on public.spray_execution_change_log (work_order_id, changed_at);

alter table public.spray_execution_change_log enable row level security;

create policy "Authorized users can view the change log" on public.spray_execution_change_log for select
  to authenticated using (public.can_manage_spray_execution(work_order_id));
create policy "Authorized users can write to the change log" on public.spray_execution_change_log for insert
  to authenticated with check (public.can_manage_spray_execution(work_order_id));

-- ---------------------------------------------------------------------------
-- Correcting an observed application: extend the existing spray_loads /
-- spray_load_products write policies (Phase 4) from "only while
-- in_progress" to "in_progress or observed". Same shape, just the status
-- list changes -- planning stays locked (no change to work_orders' own
-- policies), only load/product data becomes writable again for the
-- correction cycle.
-- ---------------------------------------------------------------------------

drop policy "Authorized users can insert spray loads while in progress" on public.spray_loads;
create policy "Authorized users can insert spray loads while editable" on public.spray_loads for insert
  to authenticated with check (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status in ('in_progress', 'observed')
    )
  );

drop policy "Authorized users can update spray loads while in progress" on public.spray_loads;
create policy "Authorized users can update spray loads while editable" on public.spray_loads for update
  to authenticated using (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status in ('in_progress', 'observed')
    )
  )
  with check (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status in ('in_progress', 'observed')
    )
  );

drop policy "Authorized users can delete spray loads while in progress" on public.spray_loads;
create policy "Authorized users can delete spray loads while editable" on public.spray_loads for delete
  to authenticated using (
    public.can_manage_spray_execution(work_order_id)
    and exists (
      select 1 from public.work_orders wo
      where wo.id = spray_loads.work_order_id and wo.status in ('in_progress', 'observed')
    )
  );

drop policy "Authorized users can insert spray load products while in progress" on public.spray_load_products;
create policy "Authorized users can insert spray load products while editable" on public.spray_load_products for insert
  to authenticated with check (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status in ('in_progress', 'observed')
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

drop policy "Authorized users can update spray load products while in progress" on public.spray_load_products;
create policy "Authorized users can update spray load products while editable" on public.spray_load_products for update
  to authenticated using (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status in ('in_progress', 'observed')
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  )
  with check (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status in ('in_progress', 'observed')
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

drop policy "Authorized users can delete spray load products while in progress" on public.spray_load_products;
create policy "Authorized users can delete spray load products while editable" on public.spray_load_products for delete
  to authenticated using (
    exists (
      select 1 from public.spray_loads sl
      join public.work_orders wo on wo.id = sl.work_order_id
      where sl.id = spray_load_products.spray_load_id
        and wo.status in ('in_progress', 'observed')
        and public.can_manage_spray_execution(sl.work_order_id)
    )
  );

-- spray_executions: a new, narrow UPDATE policy for correcting
-- actual_area_ha/notes while observed (used by
-- update_spray_execution_summary, SECURITY INVOKER). Still no policy
-- lets anyone touch started_at/started_by/finished_at/finished_by --
-- only the RPC's own UPDATE statement (below) ever sets those, and this
-- policy only needs to authorize the statement, not limit its columns,
-- because the RPC is the only caller in practice (same reasoning as
-- Phase 4's start/finish functions being the sole door to their columns).
create policy "Authorized users can correct execution summary while observed" on public.spray_executions for update
  to authenticated using (
    public.can_manage_spray_execution(work_order_id)
    and exists (select 1 from public.work_orders wo where wo.id = spray_executions.work_order_id and wo.status = 'observed')
  )
  with check (
    public.can_manage_spray_execution(work_order_id)
    and exists (select 1 from public.work_orders wo where wo.id = spray_executions.work_order_id and wo.status = 'observed')
  );

-- ---------------------------------------------------------------------------
-- review_spray_application -- engineer/admin decision. SECURITY INVOKER:
-- admin/engineer already have a broad UPDATE grant on work_orders (Phase
-- 3's "Engineers and admins can update work orders" policy), so RLS
-- already stops an applicator from reaching the UPDATE below (0 rows
-- match -> "not found"). The explicit status = 'pending_review' guard in
-- the UPDATE's WHERE clause makes the transition atomic and race-safe,
-- same pattern as Phase 4's start/finish functions.
-- ---------------------------------------------------------------------------

create function public.review_spray_application(
  p_work_order_id uuid,
  p_decision text,
  p_notes text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_new_status text;
begin
  if p_decision not in ('approved', 'observed') then
    raise exception 'Invalid review decision: %', p_decision;
  end if;

  if p_decision = 'observed' and (p_notes is null or length(trim(p_notes)) = 0) then
    raise exception 'El comentario es obligatorio para observar una aplicación';
  end if;

  v_new_status := case p_decision when 'approved' then 'completed' else 'observed' end;

  update public.work_orders
  set status = v_new_status
  where id = p_work_order_id and status = 'pending_review'
  returning organization_id into v_organization_id;

  if not found then
    raise exception 'Work order not found, not authorized, or not pending review';
  end if;

  insert into public.spray_reviews (organization_id, work_order_id, decision, notes, reviewed_by, reviewed_at)
  values (v_organization_id, p_work_order_id, p_decision, p_notes, auth.uid(), now());

  return p_work_order_id;
end;
$$;

grant execute on function public.review_spray_application to authenticated;

-- ---------------------------------------------------------------------------
-- resend_to_review -- SECURITY DEFINER, same reasoning as Phase 4's
-- start/finish: the applicator has no direct UPDATE grant on
-- work_orders, and this is a single narrow status transition with no
-- caller-controlled columns beyond the target work order id.
-- ---------------------------------------------------------------------------

create function public.resend_to_review(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if not public.can_manage_spray_execution(p_work_order_id) then
    raise exception 'Not authorized to resend this work order to review';
  end if;

  update public.work_orders
  set status = 'pending_review'
  where id = p_work_order_id and status = 'observed'
  returning organization_id into v_organization_id;

  if not found then
    raise exception 'Only an observed work order can be resent to review';
  end if;

  insert into public.spray_reviews (organization_id, work_order_id, decision, notes, reviewed_by, reviewed_at)
  values (v_organization_id, p_work_order_id, 'resent', null, auth.uid(), now());

  return p_work_order_id;
end;
$$;

grant execute on function public.resend_to_review to authenticated;

-- ---------------------------------------------------------------------------
-- update_spray_execution_summary -- correct actual_area_ha/notes while
-- observed. SECURITY INVOKER, relies on the RLS policy added above.
-- Logs to the change log (only reachable in practice while observed,
-- since that's what the RLS policy already requires -- the explicit
-- status check here is what produces a clear error message instead of a
-- bare "0 rows updated").
-- ---------------------------------------------------------------------------

create function public.update_spray_execution_summary(
  p_work_order_id uuid,
  p_actual_area_ha numeric,
  p_notes text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_before jsonb;
  v_organization_id uuid;
begin
  select wo.status, wo.organization_id into v_status, v_organization_id
  from public.work_orders wo where wo.id = p_work_order_id;

  if v_status is null then
    raise exception 'Work order not found or not authorized';
  end if;

  if v_status <> 'observed' then
    raise exception 'La superficie y las observaciones solo se pueden corregir con la aplicación en estado observada';
  end if;

  if p_actual_area_ha is null or p_actual_area_ha <= 0 then
    raise exception 'actual_area_ha must be greater than 0';
  end if;

  select to_jsonb(e.*) into v_before from public.spray_executions e where e.work_order_id = p_work_order_id;

  update public.spray_executions
  set actual_area_ha = p_actual_area_ha, notes = p_notes
  where work_order_id = p_work_order_id;

  if not found then
    raise exception 'Spray execution not found or not authorized';
  end if;

  insert into public.spray_execution_change_log (organization_id, work_order_id, entity_type, record_id, action, changed_by, before, after)
  values (
    v_organization_id, p_work_order_id, 'spray_execution', p_work_order_id, 'update', auth.uid(),
    v_before, jsonb_build_object('actual_area_ha', p_actual_area_ha, 'notes', p_notes)
  );

  return p_work_order_id;
end;
$$;

grant execute on function public.update_spray_execution_summary to authenticated;

-- ---------------------------------------------------------------------------
-- register_spray_load / update_spray_load: extend with conditional audit
-- logging (only when the work order is currently 'observed'), and add
-- delete_spray_load as the third RPC so every load-mutating path can log
-- uniformly instead of one of them being a bare client-side DELETE.
-- ---------------------------------------------------------------------------

create or replace function public.register_spray_load(
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
  v_status text;
  v_after jsonb;
begin
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

  select status into v_status from public.work_orders where id = p_work_order_id;

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

  if v_status = 'observed' then
    select jsonb_build_object('water_liters', p_water_liters, 'notes', p_notes, 'products', coalesce(p_products, '[]'::jsonb))
    into v_after;

    insert into public.spray_execution_change_log (organization_id, work_order_id, entity_type, record_id, action, changed_by, before, after)
    values (v_organization_id, p_work_order_id, 'spray_load', v_load_id, 'insert', auth.uid(), null, v_after);
  end if;

  return v_load_id;
end;
$$;

create or replace function public.update_spray_load(
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
  v_work_order_id uuid;
  v_product jsonb;
  v_status text;
  v_before jsonb;
  v_after jsonb;
begin
  select jsonb_build_object(
    'water_liters', sl.water_liters, 'notes', sl.notes,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', slp.product_id, 'quantity_value', slp.quantity_value, 'quantity_unit', slp.quantity_unit))
      from public.spray_load_products slp where slp.spray_load_id = sl.id
    ), '[]'::jsonb)
  ), sl.work_order_id
  into v_before, v_work_order_id
  from public.spray_loads sl where sl.id = p_spray_load_id;

  select status into v_status from public.work_orders where id = v_work_order_id;

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

  if v_status = 'observed' then
    v_after := jsonb_build_object('water_liters', p_water_liters, 'notes', p_notes, 'products', coalesce(p_products, '[]'::jsonb));
    insert into public.spray_execution_change_log (organization_id, work_order_id, entity_type, record_id, action, changed_by, before, after)
    values (v_organization_id, v_work_order_id, 'spray_load', p_spray_load_id, 'update', auth.uid(), v_before, v_after);
  end if;

  return p_spray_load_id;
end;
$$;

create function public.delete_spray_load(p_spray_load_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_work_order_id uuid;
  v_status text;
  v_before jsonb;
begin
  select jsonb_build_object(
    'water_liters', sl.water_liters, 'notes', sl.notes, 'load_number', sl.load_number,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', slp.product_id, 'quantity_value', slp.quantity_value, 'quantity_unit', slp.quantity_unit))
      from public.spray_load_products slp where slp.spray_load_id = sl.id
    ), '[]'::jsonb)
  ), sl.work_order_id, sl.organization_id
  into v_before, v_work_order_id, v_organization_id
  from public.spray_loads sl where sl.id = p_spray_load_id;

  if v_work_order_id is null then
    raise exception 'Spray load not found or not authorized';
  end if;

  select status into v_status from public.work_orders where id = v_work_order_id;

  delete from public.spray_loads where id = p_spray_load_id;

  if not found then
    raise exception 'Spray load not found or not authorized';
  end if;

  if v_status = 'observed' then
    insert into public.spray_execution_change_log (organization_id, work_order_id, entity_type, record_id, action, changed_by, before, after)
    values (v_organization_id, v_work_order_id, 'spray_load', p_spray_load_id, 'delete', auth.uid(), v_before, null);
  end if;
end;
$$;

grant execute on function public.delete_spray_load to authenticated;
