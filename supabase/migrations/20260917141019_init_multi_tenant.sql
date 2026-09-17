-- Foundations: multi-tenant model (organizations / profiles / organization_members)
-- with role-based RLS. See docs/database.md for the full rationale.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('admin', 'engineer', 'applicator');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'A contractor company using the platform. Every operational record is scoped to one organization.';

-- 1:1 with auth.users. Created automatically by the handle_new_user trigger
-- below whenever a new Supabase Auth user is created.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile data for an auth.users row. One row per user, independent of organization membership.';

-- A user's membership in an organization, with the role that governs their
-- permissions within it. A user can hold at most one membership row per
-- organization (composite unique constraint), and can in principle belong
-- to more than one organization -- the MVP UI only surfaces a single
-- active organization per user, but the schema does not assume that.
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Join table between users and organizations, carrying the role that drives authorization. audit_log (planned) will reference this table for who-did-what trails.';

create index organization_members_organization_id_idx on public.organization_members (organization_id);
create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_active_user_idx on public.organization_members (user_id) where active;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth.users -> public.profiles
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions
--
-- These run as SECURITY DEFINER owned by the migration role (superuser in
-- Supabase), so they bypass RLS on organization_members internally -- this
-- is what avoids infinite recursion when organization_members' own RLS
-- policies call back into these functions.
-- ---------------------------------------------------------------------------

create function public.is_org_member(p_organization_id uuid)
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
      and m.active = true
  );
$$;

create function public.is_org_admin(p_organization_id uuid)
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
      and m.role = 'admin'
      and m.active = true
  );
$$;

create function public.shares_org_with(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and mine.active = true
      and theirs.user_id = p_user_id
      and theirs.active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;

-- organizations: members can read their own organization. Only admins can
-- update it. Creation/deletion is intentionally left without a policy (so
-- it is denied for anon/authenticated) -- provisioning a new organization
-- is a backend/service-role operation for this phase.
create policy "Members can view their organization"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

create policy "Admins can update their organization"
  on public.organizations for update
  to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- profiles: everyone can read their own profile plus the profiles of
-- people who share an organization with them (needed for admin/engineer
-- screens that list users). Everyone can only ever edit their own profile.
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.shares_org_with(id));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- organization_members: any active member of an organization can see its
-- member list. Only admins can add, change or remove members.
create policy "Members can view their organization's members"
  on public.organization_members for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Admins can add organization members"
  on public.organization_members for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

create policy "Admins can update organization members"
  on public.organization_members for update
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "Admins can remove organization members"
  on public.organization_members for delete
  to authenticated
  using (public.is_org_admin(organization_id));
