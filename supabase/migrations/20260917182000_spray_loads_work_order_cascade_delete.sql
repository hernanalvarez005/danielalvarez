-- spray_loads' FK to work_orders was also missing ON DELETE CASCADE
-- (spray_order_products happens to have a second, separate cascading FK
-- on work_order_id alone from Phase 3, which is why it wasn't affected;
-- spray_loads only ever had the composite one). Same class of gap as
-- the two prior fix migrations, found the same way: real deletion of
-- throwaway test data blocked on this constraint.

alter table public.spray_loads
  drop constraint spray_loads_work_order_id_organization_id_fkey;
alter table public.spray_loads
  add constraint spray_loads_work_order_id_organization_id_fkey
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id) on delete cascade;
