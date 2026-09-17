-- Phase 2: master/operational data shared by every future work-order type
-- (pulverizaciones, siembras, cosechas, fertilizaciones, ...).
--
-- customers -> fields -> plots is the core hierarchy. campaigns, crops,
-- products and applicators are flatter catalogs. Every table is
-- organization-scoped and RLS-protected; cross-organization inconsistency
-- (e.g. a field pointing at a customer from a different org) is prevented
-- by the database itself via composite foreign keys, not by application
-- code. No physical delete anywhere here -- see the `active` column.

-- ---------------------------------------------------------------------------
-- Shared audit trigger for created_by / updated_by, used by every table in
-- this migration (organizations/profiles from the init migration keep
-- their own set_updated_at trigger unchanged).
-- ---------------------------------------------------------------------------

create function public.set_audit_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS helper: active admin or engineer -- the two roles allowed to manage
-- operational master data. Applicators get read access (useful once they
-- have their own screens) but never write access here.
-- ---------------------------------------------------------------------------

create function public.is_org_engineer_or_admin(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'engineer')
      and m.active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  legal_name text,
  tax_id text,
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lets fields (customer_id, organization_id) FK against this pair, so a
  -- field can never reference a customer from a different organization.
  unique (id, organization_id)
);

comment on table public.customers is
  'Clients/producers that work orders are executed for.';

create index customers_organization_id_idx on public.customers (organization_id);
create index customers_organization_active_idx on public.customers (organization_id) where active;

create trigger set_audit_columns
  before update on public.customers
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- fields (campos)
-- ---------------------------------------------------------------------------

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  name text not null check (char_length(trim(name)) > 0),
  locality text,
  province text,
  notes text,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers (id, organization_id) on delete cascade
);

comment on table public.fields is
  'A customer''s establecimiento/campo. Always belongs to exactly one customer, enforced at the DB level.';

create index fields_organization_id_idx on public.fields (organization_id);
create index fields_customer_id_idx on public.fields (customer_id);
create index fields_organization_active_idx on public.fields (organization_id) where active;

create trigger set_audit_columns
  before update on public.fields
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- plots (lotes)
-- ---------------------------------------------------------------------------

create table public.plots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  field_id uuid not null,
  name text not null check (char_length(trim(name)) > 0),
  -- Reference/habitual surface. A future work order may record its own
  -- worked surface without rewriting this master value.
  area_ha numeric check (area_ha is null or area_ha >= 0),
  notes text,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (field_id, organization_id)
    references public.fields (id, organization_id) on delete cascade
);

comment on table public.plots is
  'A lote within a field. area_ha is a reference surface, not necessarily what a future work order actually covers.';

create index plots_organization_id_idx on public.plots (organization_id);
create index plots_field_id_idx on public.plots (field_id);
create index plots_organization_active_idx on public.plots (organization_id) where active;

create trigger set_audit_columns
  before update on public.plots
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- campaigns (campañas agrícolas)
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  start_date date,
  end_date date,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index campaigns_organization_id_idx on public.campaigns (organization_id);
create index campaigns_organization_active_idx on public.campaigns (organization_id) where active;

create trigger set_audit_columns
  before update on public.campaigns
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- crops (cultivos)
-- ---------------------------------------------------------------------------

create table public.crops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index crops_organization_id_idx on public.crops (organization_id);
create index crops_organization_active_idx on public.crops (organization_id) where active;

create trigger set_audit_columns
  before update on public.crops
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- products
--
-- No stock/cost/supplier/active-ingredient/SENASA/batch tracking yet --
-- this is only the catalog future recetas will reference.
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  -- CHECK, not an enum: enums are append-only in Postgres and awkward to
  -- correct later; a CHECK can be redefined in a follow-up migration.
  default_unit text not null check (default_unit in ('l', 'ml', 'kg', 'g', 'cc')),
  notes text,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index products_organization_id_idx on public.products (organization_id);
create index products_organization_active_idx on public.products (organization_id) where active;

create trigger set_audit_columns
  before update on public.products
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- applicators
-- ---------------------------------------------------------------------------

create table public.applicators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Nullable: an applicator is a person who works in the field, not
  -- necessarily a system user. Can be linked to one later.
  profile_id uuid references public.profiles (id),
  name text not null check (char_length(trim(name)) > 0),
  phone text,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applicators_organization_id_idx on public.applicators (organization_id);
create index applicators_profile_id_idx on public.applicators (profile_id);
create index applicators_organization_active_idx on public.applicators (organization_id) where active;

create trigger set_audit_columns
  before update on public.applicators
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Every table: any active org member can read; only active admin/engineer
-- can write. No delete policy anywhere -- physical delete is intentionally
-- unsupported, records are deactivated via `active` instead.
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.fields enable row level security;
alter table public.plots enable row level security;
alter table public.campaigns enable row level security;
alter table public.crops enable row level security;
alter table public.products enable row level security;
alter table public.applicators enable row level security;

create policy "Members can view customers" on public.customers for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create customers" on public.customers for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update customers" on public.customers for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

create policy "Members can view fields" on public.fields for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create fields" on public.fields for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update fields" on public.fields for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

create policy "Members can view plots" on public.plots for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create plots" on public.plots for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update plots" on public.plots for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

create policy "Members can view campaigns" on public.campaigns for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create campaigns" on public.campaigns for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update campaigns" on public.campaigns for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

create policy "Members can view crops" on public.crops for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create crops" on public.crops for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update crops" on public.crops for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

create policy "Members can view products" on public.products for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create products" on public.products for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update products" on public.products for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));

create policy "Members can view applicators" on public.applicators for select
  to authenticated using (public.is_org_member(organization_id));
create policy "Engineers and admins can create applicators" on public.applicators for insert
  to authenticated with check (public.is_org_engineer_or_admin(organization_id));
create policy "Engineers and admins can update applicators" on public.applicators for update
  to authenticated using (public.is_org_engineer_or_admin(organization_id))
  with check (public.is_org_engineer_or_admin(organization_id));
