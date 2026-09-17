-- created_by defaults to auth.uid(), which is NULL for any insert made
-- with the service role key (no user JWT in that context) -- e.g.
-- scripts/seed-admin.mjs and scripts/seed-master-data.mjs. NOT NULL was
-- wrong: not every row is created by an authenticated end user through
-- the app UI. Real user-driven inserts (the only path the app itself
-- uses) still get created_by populated correctly via the column default.

alter table public.customers alter column created_by drop not null;
alter table public.fields alter column created_by drop not null;
alter table public.plots alter column created_by drop not null;
alter table public.campaigns alter column created_by drop not null;
alter table public.crops alter column created_by drop not null;
alter table public.products alter column created_by drop not null;
alter table public.applicators alter column created_by drop not null;
