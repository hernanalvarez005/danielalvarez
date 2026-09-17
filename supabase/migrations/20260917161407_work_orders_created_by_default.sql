-- work_orders.created_by was left without a default, unlike every Phase 2
-- table -- it always came back null. Since create_spray_work_order() is
-- SECURITY INVOKER, auth.uid() resolves correctly to the real calling
-- user inside its INSERT, same as any direct insert would. Nullable stays
-- (per the Phase 2 lesson: never NOT NULL, service-role/admin scripts may
-- still need to insert without a user context).

alter table public.work_orders alter column created_by set default auth.uid();
