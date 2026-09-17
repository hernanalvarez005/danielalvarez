-- spray_reviews and spray_execution_change_log were missing ON DELETE
-- CASCADE to work_orders, unlike spray_orders/spray_order_products
-- (Phase 3) and spray_executions/spray_loads (Phase 4). The app never
-- deletes a work_order (cancellation is a status update, not a DELETE),
-- but this gap was found the same way Phase 4's spray_load_products one
-- was: real cleanup of throwaway test data failed with a foreign key
-- violation.

alter table public.spray_reviews
  drop constraint spray_reviews_work_order_id_organization_id_fkey;
alter table public.spray_reviews
  add constraint spray_reviews_work_order_id_organization_id_fkey
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id) on delete cascade;

alter table public.spray_execution_change_log
  drop constraint spray_execution_change_log_work_order_id_organization_id_fkey;
alter table public.spray_execution_change_log
  add constraint spray_execution_change_log_work_order_id_organization_id_fkey
  foreign key (work_order_id, organization_id) references public.work_orders (id, organization_id) on delete cascade;
