-- spray_load_products' FK to spray_loads was missing ON DELETE CASCADE,
-- unlike every other line-item table in this project (spray_order_products
-- relies on a plain DELETE + full-replace instead, so this gap wasn't
-- caught by that pattern). Deleting a spray_loads row is meant to be a
-- single atomic DELETE statement (see deleteSprayLoad in
-- lib/spray-executions/actions.ts) -- found via real testing: deleting a
-- load with products failed with a foreign key violation instead of
-- cascading.

alter table public.spray_load_products
  drop constraint spray_load_products_spray_load_id_organization_id_fkey;

alter table public.spray_load_products
  add constraint spray_load_products_spray_load_id_organization_id_fkey
  foreign key (spray_load_id, organization_id) references public.spray_loads (id, organization_id) on delete cascade;
