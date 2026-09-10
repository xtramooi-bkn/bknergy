-- Apply after the campaign/rule migrations. Run as the database owner.
begin;
lock table public.campaigns, public.rewards in share row exclusive mode;
alter table public.campaigns add column if not exists remaining_pool numeric;
-- Account for existing rewards conservatively; never restore previously reserved funds.
update public.campaigns c set remaining_pool = least(
  coalesce(c.remaining_pool, c.reward_pool),
  c.reward_pool - coalesce((select sum(r.amount) from public.rewards r where r.campaign_id = c.id), 0)
);
alter table public.campaigns alter column remaining_pool set not null;
alter table public.campaigns add constraint campaigns_budget_bounds
  check (reward_pool >= 0 and remaining_pool >= 0 and remaining_pool <= reward_pool);
alter table public.rewards add constraint rewards_budget_amount
  check (amount is not null and amount > 0 and amount = trunc(amount));
alter table public.rewards add constraint rewards_lifecycle_status
  check (status is not null and status in ('pending', 'processing', 'distributed', 'failed'));
-- Existing UNIQUE(activity_id) is required; ON CONFLICT fails closed if absent.

create or replace function public.reserve_activity_reward(p_activity_id uuid)
returns setof public.rewards
language plpgsql security definer set search_path = ''
as $$
declare
  a public.activities%rowtype;
  c public.campaigns%rowtype;
  rule public.reward_rules%rowtype;
  saved public.rewards%rowtype;
  score integer := 100;
  units numeric;
  eligible numeric;
begin
  select * into a from public.activities where id = p_activity_id for update;
  if not found then raise exception 'Activity not found' using errcode = 'P0002'; end if;
  if a.distance_meters is null or a.distance_meters < 0 or a.duration_seconds is null or a.duration_seconds <= 0 then
    raise exception 'Invalid activity measurements';
  end if;
  -- Recheck the existing verifyActivity rules inside the same locked transaction.
  if a.gps_available is not true then score := score - 20; end if;
  if a.avg_heart_rate is null then score := score - 10; end if;
  if lower(a.source) = 'manual' then score := score - 25; end if;
  if lower(a.type) = 'running' and (a.distance_meters::numeric / a.duration_seconds) * 3.6 > 25 then score := score - 50; end if;
  if score < 80 then raise exception 'Activity is not verified'; end if;
  select * into saved from public.rewards where activity_id = a.id;
  if found then return next saved; return; end if;
  select * into c from public.campaigns where id = a.campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if c.status <> 'active' or c.status is null then raise exception 'Campaign is not active'; end if;
  select * into strict rule from public.reward_rules
    where campaign_id = c.id and activity_type = lower(a.type) for share;
  if rule.threshold is null or rule.threshold <= 0 or rule.reward_amount is null or rule.reward_amount < 0 or rule.max_reward < 0 then
    raise exception 'Invalid reward rule';
  end if;
  -- Mirrors calculateReward: proportional distance, completed duration blocks, whole tokens.
  if rule.metric = 'distance_km' then units := (a.distance_meters::numeric / 1000) / rule.threshold;
  elsif rule.metric = 'duration_minutes' then units := floor((a.duration_seconds::numeric / 60) / rule.threshold);
  else raise exception 'Unsupported reward metric'; end if;
  eligible := floor(units * rule.reward_amount);
  if rule.max_reward is not null then eligible := floor(least(eligible, rule.max_reward)); end if;
  if eligible <= 0 or eligible > 9007199254740991 or eligible::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'No valid payable reward';
  end if;
  if c.remaining_pool is null or c.remaining_pool < eligible then
    raise exception 'Campaign has insufficient remaining budget' using errcode = 'P0001';
  end if;
  insert into public.rewards (activity_id, user_id, campaign_id, amount, status)
    values (a.id, a.user_id, c.id, eligible, 'pending')
    on conflict (activity_id) do nothing returning * into saved;
  if not found then
    return query select r.* from public.rewards r where r.activity_id = a.id;
    return;
  end if;
  update public.campaigns set remaining_pool = remaining_pool - eligible
    where id = c.id and remaining_pool >= eligible;
  if not found then raise exception 'Campaign has insufficient remaining budget'; end if;
  return next saved;
end;
$$;
revoke all on function public.reserve_activity_reward(uuid) from public, anon, authenticated;
grant execute on function public.reserve_activity_reward(uuid) to service_role;
-- Prevent the old direct-insert path from bypassing budget reservation.
revoke insert, update, delete on public.rewards from anon, authenticated, service_role;
revoke update on public.campaigns from anon, authenticated, service_role;
grant select on public.activities, public.campaigns, public.reward_rules, public.rewards to service_role;
do $$ begin
  if to_regprocedure('public.create_pending_activity_reward(uuid,numeric)') is not null then
    execute 'revoke execute on function public.create_pending_activity_reward(uuid,numeric) from public, anon, authenticated, service_role';
  end if;
end $$;
commit;
-- Failed rewards remain reserved. No refunds or status transitions are performed here.
