-- Phase 3: work orders + spray-specific extension + recipe.
--
-- work_orders is the operation-agnostic base entity every future work
-- type (siembra, cosecha, fertilización, ...) will share. spray_orders is
-- the spraying-specific 1:1 extension, and spray_order_products is the
-- recipe (any number of product lines, never product_1/product_2/...).
--
-- This phase only plans work -- draft/pending/cancelled. in_progress /
-- pending_review / completed exist in the status vocabulary already so
-- Phase 4/5 don't need a schema migration to introduce them, but nothing
-- here transitions a work order into them.

-- ---------------------------------------------------------------------------
-- Composite FK targets needed on top of Phase 2's tables. customers and
-- fields already have unique(id, organization_id) from that migration;
-- the rest are new, added here because Phase 2 had no reason to need them
-- yet.
-- ---------------------------------------------------------------------------

alter table public.fields add constraint fields_id_customer_id_key unique (id, customer_id);
alter table public.plots add constraint plots_id_field_id_key unique (id, field_id);
alter table public.campaigns add constraint campaigns_id_organization_id_key unique (id, organization_id);
alter table public.crops add constraint crops_id_organization_id_key unique (id, organization_id);
alter table public.products add constraint products_id_organization_id_key unique (id, organization_id);
alter table public.applicators add constraint applicators_id_organization_id_key unique (id, organization_id);

-- ---------------------------------------------------------------------------
-- Per-organization order numbering, race-condition-safe.
--
-- next_order_number() is called from a BEFORE INSERT trigger on
-- work_orders, never computed client-side. The INSERT ... ON CONFLICT DO
-- UPDATE ... RETURNING below takes an atomic row-level lock on that
-- organization's counter row: two concurrent inserts for the same org
-- serialize correctly (the second waits for the first's transaction to
-- finish), while inserts for different orgs never block each other.
-- ---------------------------------------------------------------------------

create table public.order_number_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_number bigint not null default 0
);

comment on table public.order_number_counters is
  'One row per organization; last_number is only ever touched by next_order_number(). Not exposed directly via the API (RLS denies all access) -- everything goes through that function.';

alter table public.order_number_counters enable row level security;
-- Intentionally no policies: this table is only ever written by the
-- SECURITY DEFINER function below, never directly via the API.

create function public.next_order_number(p_organization_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next bigint;
begin
  insert into public.order_number_counters (organization_id, last_number)
  values (p_organization_id, 1)
  on conflict (organization_id)
    do update set last_number = public.order_number_counters.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- work_orders
-- ---------------------------------------------------------------------------

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_number bigint not null,
  -- CHECK, not enum, same reasoning as products.default_unit in Phase 2:
  -- easy to extend with 'sowing'/'harvest'/... via a later migration.
  operation_type text not null default 'spraying' check (operation_type in ('spraying')),
  customer_id uuid not null,
  field_id uuid not null,
  plot_id uuid not null,
  -- Nullable at the schema level so a draft can be saved before they're
  -- known -- the app enforces both as required to confirm (status =
  -- 'pending'), same treatment as scheduled_date.
  campaign_id uuid,
  crop_id uuid,
  applicator_id uuid,
  scheduled_date date,
  -- Initialized from plots.area_ha when a plot is picked (app-side, at
  -- creation time only) but independent from then on -- editing it never
  -- writes back to the plot's reference surface.
  planned_area_ha numeric not null check (planned_area_ha >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'in_progress', 'pending_review', 'completed', 'cancelled')),
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number),
  unique (id, organization_id),
  -- Hierarchy integrity, not just same-organization: the field must
  -- really belong to the chosen customer, and (below) the plot to the
  -- chosen field. Stronger than an organization_id-only check.
  foreign key (customer_id, organization_id) references public.customers (id, organization_id),
  foreign key (field_id, customer_id) references public.fields (id, customer_id),
  foreign key (plot_id, field_id) references public.plots (id, field_id),
  foreign key (campaign_id, organization_id) references public.campaigns (id, organization_id),
  foreign key (crop_id, organization_id) references public.crops (id, organization_id),
  foreign key (applicator_id, organization_id) references public.applicators (id, organization_id)
);

comment on table public.work_orders is
  'Operation-agnostic work order base entity. operation_type=spraying is extended by spray_orders. Future operation types (siembra, cosecha, ...) will get their own extension tables the same way.';

create index work_orders_organization_id_idx on public.work_orders (organization_id);
create index work_orders_customer_id_idx on public.work_orders (customer_id);
create index work_orders_field_id_idx on public.work_orders (field_id);
create index work_orders_plot_id_idx on public.work_orders (plot_id);
create index work_orders_status_idx on public.work_orders (organization_id, status);

create function public.set_work_order_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_number is null then
    new.order_number = public.next_order_number(new.organization_id);
  end if;
  return new;
end;
$$;

create trigger set_order_number
  before insert on public.work_orders
  for each row execute function public.set_work_order_number();

create trigger set_audit_columns
  before update on public.work_orders
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- spray_orders -- 1:1 extension of a 'spraying' work order.
-- ---------------------------------------------------------------------------

create table public.spray_orders (
  work_order_id uuid primary key references public.work_orders (id) on delete cascade,
  application_method text not null check (application_method in ('ground', 'aerial')),
  -- Target liters of caldo (spray mix) per hectare. Useful in Phase 4 to
  -- compare against actual tank loads -- nothing real is recorded here.
  target_spray_volume_per_ha numeric check (target_spray_volume_per_ha is null or target_spray_volume_per_ha >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.spray_orders is
  'Spraying-specific fields for a work_order. No organization_id column -- scoped via work_order_id.';

create trigger set_updated_at
  before update on public.spray_orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- spray_order_products -- the recipe. Any number of product lines.
-- ---------------------------------------------------------------------------

create table public.spray_order_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  product_id uuid not null,
  dose_value numeric not null check (dose_value > 0),
  -- Deliberately its own vocabulary, not products.default_unit: that
  -- column is the product's habitual unit; this one is whatever unit
  -- this specific recipe line actually uses.
  dose_unit text not null check (dose_unit in ('l_ha', 'ml_ha', 'cc_ha', 'kg_ha', 'g_ha')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id, product_id),
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id),
  foreign key (product_id, organization_id) references public.products (id, organization_id)
);

create index spray_order_products_organization_id_idx on public.spray_order_products (organization_id);
create index spray_order_products_work_order_id_idx on public.spray_order_products (work_order_id);

create trigger set_updated_at
  before update on public.spray_order_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.work_orders enable row level security;
alter table public.spray_orders enable row level security;
alter table public.spray_order_products enable row level security;

-- work_orders: any active member (including applicator) can read; only
-- admin/engineer can write. No delete -- cancellation is a status update.
create policy "Members can view work orders" on public.work_orders for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create work orders" on public.work_orders for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update work orders" on public.work_orders for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

-- spray_orders has no organization_id column -- scope through its parent
-- work_order.
create policy "Members can view spray orders" on public.spray_orders for select
  to authenticated using (
    exists (
      select 1 from public.work_orders wo
      where wo.id = spray_orders.work_order_id
        and public.is_org_member(wo.organization_id)
    )
  );
create policy "Engineers and admins can create spray orders" on public.spray_orders for insert
  to authenticated with check (
    exists (
      select 1 from public.work_orders wo
      where wo.id = spray_orders.work_order_id
        and public.is_org_engineer_or_admin(wo.organization_id)
    )
  );
create policy "Engineers and admins can update spray orders" on public.spray_orders for update
  to authenticated using (
    exists (
      select 1 from public.work_orders wo
      where wo.id = spray_orders.work_order_id
        and public.is_org_engineer_or_admin(wo.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.work_orders wo
      where wo.id = spray_orders.work_order_id
        and public.is_org_engineer_or_admin(wo.organization_id)
    )
  );

-- spray_order_products: has its own organization_id, so this is the
-- direct Phase 2-style policy set. DELETE is allowed here (unlike master
-- data) because replacing a draft/pending recipe legitimately removes
-- product lines -- these rows are compositional details of an editable
-- plan, not standalone historical records.
create policy "Members can view spray order products" on public.spray_order_products for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create spray order products" on public.spray_order_products for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update spray order products" on public.spray_order_products for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can delete spray order products" on public.spray_order_products for delete
  to authenticated using (public.is_org_engineer_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Atomic create/update RPCs.
--
-- A work order write touches 3 tables (work_orders, spray_orders,
-- spray_order_products) and must never leave a partial state (e.g. a
-- work_order row with no matching spray_order because a later insert
-- failed). PostgREST/supabase-js has no generic multi-table client
-- transaction, so this is done as a single Postgres function -- a
-- function body runs inside the transaction of its calling statement, so
-- any exception (including an RLS violation on an inner insert/update)
-- rolls back everything the function did, automatically.
--
-- Both are SECURITY INVOKER (the default -- no `security definer` here)
-- on purpose: every inner statement is evaluated under RLS as the actual
-- calling user, so an applicator calling this directly gets rejected by
-- the same policies as a plain insert would, with no permission logic
-- duplicated inside the function.
-- ---------------------------------------------------------------------------

create function public.create_spray_work_order(
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
  v_work_order_id uuid;
  v_product jsonb;
begin
  -- Never trust an organization_id from the client: resolve it from the
  -- caller's own active membership, exactly like getAuthContext() does
  -- in the app.
  select organization_id into v_organization_id
  from public.organization_members
  where user_id = auth.uid() and active = true
  limit 1;

  if v_organization_id is null then
    raise exception 'No active organization membership for current user';
  end if;

  if p_status not in ('draft', 'pending') then
    raise exception 'Invalid initial status: %', p_status;
  end if;

  insert into public.work_orders (
    organization_id, customer_id, field_id, plot_id, campaign_id, crop_id,
    applicator_id, scheduled_date, planned_area_ha, notes, status
  ) values (
    v_organization_id, p_customer_id, p_field_id, p_plot_id, p_campaign_id, p_crop_id,
    p_applicator_id, p_scheduled_date, p_planned_area_ha, p_notes, p_status
  )
  returning id into v_work_order_id;

  insert into public.spray_orders (work_order_id, application_method, target_spray_volume_per_ha)
  values (v_work_order_id, p_application_method, p_target_spray_volume_per_ha);

  for v_product in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb))
  loop
    insert into public.spray_order_products (
      organization_id, work_order_id, product_id, dose_value, dose_unit, sort_order
    ) values (
      v_organization_id,
      v_work_order_id,
      (v_product ->> 'product_id')::uuid,
      (v_product ->> 'dose_value')::numeric,
      v_product ->> 'dose_unit',
      coalesce((v_product ->> 'sort_order')::int, 0)
    );
  end loop;

  return v_work_order_id;
end;
$$;

grant execute on function public.create_spray_work_order to authenticated;

create function public.update_spray_work_order(
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
  v_product jsonb;
begin
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

grant execute on function public.update_spray_work_order to authenticated;
