-- Apply after atomic budgets. Does not change reward amounts, statuses or uniqueness.
begin;
-- Block reservation writers before repairing links and balances, in campaign -> reward order.
lock table public.campaigns in exclusive mode;
lock table public.rewards in share row exclusive mode;
-- Only repair missing links from the activity's explicit campaign. Never overwrite a link.
update public.rewards r set campaign_id=a.campaign_id
from public.activities a where r.activity_id=a.id and r.campaign_id is null and a.campaign_id is not null;

create or replace function public.reconcile_campaign_reward_pool(p_campaign_id uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare pool numeric; reserved numeric; remaining numeric;
begin
 -- Same campaign row lock used by reserve_activity_reward; no concurrent reservation can be lost.
 select reward_pool into pool from public.campaigns where id=p_campaign_id for update;
 if not found then raise exception 'Campaign not found'; end if;
 select coalesce(sum(amount),0) into reserved from public.rewards
 where campaign_id=p_campaign_id and status in ('pending','processing','distributed','failed');
 remaining:=greatest(0,pool-reserved);
 if reserved>pool then raise warning 'Campaign % reservations exceed pool; remaining clamped to zero',p_campaign_id; end if;
 update public.campaigns set remaining_pool=remaining where id=p_campaign_id;
 return remaining;
end $$;

-- Single statement snapshot: pool and totals cannot be read from different reservation commits.
create or replace function public.get_campaign_budget_integrity(p_campaign_id uuid)
returns table(reward_pool numeric,remaining_pool numeric,reserved numeric,expected_remaining numeric,
 pending numeric,processing numeric,distributed numeric,failed numeric,activity_count bigint,
 is_consistent boolean,over_reserved boolean)
language sql stable security definer set search_path='' as $$
 select c.reward_pool,c.remaining_pool,t.reserved,greatest(0,c.reward_pool-t.reserved),
 t.pending,t.processing,t.distributed,t.failed,t.activity_count,
 c.remaining_pool=greatest(0,c.reward_pool-t.reserved) and t.reserved<=c.reward_pool,
 t.reserved>c.reward_pool
 from public.campaigns c cross join lateral (
 select coalesce(sum(r.amount),0) reserved,
 coalesce(sum(r.amount) filter(where r.status='pending'),0) pending,
 coalesce(sum(r.amount) filter(where r.status='processing'),0) processing,
 coalesce(sum(r.amount) filter(where r.status='distributed'),0) distributed,
 coalesce(sum(r.amount) filter(where r.status='failed'),0) failed,count(*) activity_count
 from public.rewards r where r.campaign_id=c.id and r.status in ('pending','processing','distributed','failed')
 ) t where c.id=p_campaign_id;
$$;
revoke all on function public.reconcile_campaign_reward_pool(uuid) from public,anon,authenticated;
revoke all on function public.get_campaign_budget_integrity(uuid) from public,anon,authenticated;
grant execute on function public.reconcile_campaign_reward_pool(uuid) to service_role;
grant execute on function public.get_campaign_budget_integrity(uuid) to service_role;
select public.reconcile_campaign_reward_pool(id) from public.campaigns order by id;
do $$ begin
 if exists(select 1 from public.rewards where campaign_id is null) then
 raise warning 'Unlinked rewards remain: assign an explicit campaign after review, then reconcile that campaign';
 end if;
end $$;
commit;
-- Reusable owner/server call: select public.reconcile_campaign_reward_pool('<campaign UUID>');
-- Failed rewards remain reserved. No automatic refund, reward insertion or deletion.
