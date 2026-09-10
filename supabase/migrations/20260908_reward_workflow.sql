-- Existing rewards table and UNIQUE(activity_id) are preserved; no RPC is needed.
-- Run as the database owner in Supabase SQL Editor.
begin;
grant usage on schema public to service_role;
grant select on public.activities to service_role;
grant select, insert on public.rewards to service_role;
-- The public client must not submit amounts or alter reward distribution state.
revoke insert, update, delete on public.rewards from anon, authenticated;
commit;
