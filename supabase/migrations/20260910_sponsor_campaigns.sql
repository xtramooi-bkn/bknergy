-- Apply after all 20260908 migrations and 20260909_campaign_budget_reconciliation.sql.
-- Demo funding only: no payment or blockchain calls.
begin;
create table if not exists public.organisations (
 id uuid primary key default gen_random_uuid(), name text not null,
 type text not null check(type in ('employer','government','insurer','brand','sports_organisation','community','other')),
 created_at timestamptz not null default now()
);
insert into public.organisations(id,name,type) values
 ('22222222-2222-4222-8222-222222222221','BKNergy Demo Employer','employer'),
 ('22222222-2222-4222-8222-222222222222','Municipality Healthy Living','government'),
 ('22222222-2222-4222-8222-222222222223','Active Sports Brand','brand') on conflict(id) do nothing;
alter table public.campaigns
 add column if not exists organisation_id uuid references public.organisations(id),
 add column if not exists description text not null default '',
 add column if not exists start_date date,
 add column if not exists end_date date,
 add column if not exists audience text not null default 'public',
 add column if not exists max_reward_per_participant numeric,
 add column if not exists max_reward_per_day numeric,
 add column if not exists token_symbol text not null default 'BKNE';
update public.campaigns set organisation_id='22222222-2222-4222-8222-222222222221' where organisation_id is null;
alter table public.campaigns alter column organisation_id set not null;
alter table public.campaigns add constraint campaigns_launch_values check(
 status in ('draft','active','completed','paused') and audience in ('public','employees','invite_only','community')
 and (end_date is null or start_date is null or end_date>=start_date)
 and (max_reward_per_participant is null or max_reward_per_participant>=0)
 and (max_reward_per_day is null or max_reward_per_day>=0));
create table if not exists public.campaign_participants (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id),
 user_id uuid not null references public.users(id), joined_at timestamptz not null default now(),
 status text not null default 'active' check(status in ('active','left','completed')), unique(campaign_id,user_id)
);
-- Bind the local demo identity to the single existing activity owner; never invent a users row.
create table if not exists public.demo_participant (singleton boolean primary key default true check(singleton), user_id uuid not null references public.users(id));
do $$ begin
 if not exists(select 1 from public.demo_participant) then
 if (select count(distinct user_id) from public.activities where user_id is not null)<>1 then
 raise exception 'Set demo_participant to the intended existing Johan user before applying this migration';
 end if;
 insert into public.demo_participant select true,user_id from public.activities where user_id is not null group by user_id;
 end if;
end $$;
-- Preserve explicit legacy campaign assignments without moving activities or existing rewards.
insert into public.campaign_participants(campaign_id,user_id)
 select distinct campaign_id,user_id from public.activities where campaign_id is not null and user_id is not null
 on conflict(campaign_id,user_id) do nothing;
alter table public.reward_rules drop constraint if exists reward_rules_metric_check;
alter table public.reward_rules add constraint reward_rules_metric_check check(metric in ('distance_km','duration_minutes','active_minutes','steps','activity_count'));

create or replace function public.create_sponsor_campaign(p_campaign jsonb,p_rules jsonb)
returns uuid language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare new_id uuid:=gen_random_uuid(); rule jsonb; pool numeric;
begin
 if jsonb_typeof(p_campaign)<>'object' or jsonb_typeof(p_rules)<>'array' or p_campaign is null or p_rules is null then raise exception 'Invalid campaign payload'; end if;
 if exists(select 1 from jsonb_object_keys(p_campaign) k where k not in ('organisation_id','name','description','start_date','end_date','reward_pool','status','audience','max_reward_per_participant','max_reward_per_day')) then raise exception 'Unexpected campaign field'; end if;
 pool:=(p_campaign->>'reward_pool')::numeric;
 if pool is null or pool<=0 or pool>9007199254740991 or pool<>trunc(pool) then raise exception 'Invalid reward pool'; end if;
 if coalesce(length(trim(p_campaign->>'name')),0) not between 1 and 120 or coalesce(length(p_campaign->>'description'),0)>2000 then raise exception 'Invalid campaign name or description'; end if;
 if coalesce(p_campaign->>'status','') not in ('draft','active','completed','paused') or coalesce(p_campaign->>'audience','') not in ('public','employees','invite_only','community') then raise exception 'Invalid campaign status or audience'; end if;
 if nullif(p_campaign->>'start_date','') is null or nullif(p_campaign->>'end_date','') is null then raise exception 'Campaign dates required'; end if;
 if (nullif(p_campaign->>'max_reward_per_participant','')::numeric is not null and (nullif(p_campaign->>'max_reward_per_participant','')::numeric<0 or nullif(p_campaign->>'max_reward_per_participant','')::numeric>9007199254740991)) or (nullif(p_campaign->>'max_reward_per_day','')::numeric is not null and (nullif(p_campaign->>'max_reward_per_day','')::numeric<0 or nullif(p_campaign->>'max_reward_per_day','')::numeric>9007199254740991)) then raise exception 'Invalid participant cap'; end if;
 if jsonb_array_length(p_rules) not between 1 and 4 then raise exception 'Provide 1 to 4 rules'; end if;
 insert into public.campaigns(id,organisation_id,name,description,start_date,end_date,reward_pool,remaining_pool,status,audience,token,token_symbol,max_reward_per_participant,max_reward_per_day)
 values(new_id,(p_campaign->>'organisation_id')::uuid,trim(p_campaign->>'name'),coalesce(p_campaign->>'description',''),(p_campaign->>'start_date')::date,(p_campaign->>'end_date')::date,pool,pool,p_campaign->>'status',p_campaign->>'audience','BKNE','BKNE',nullif(p_campaign->>'max_reward_per_participant','')::numeric,nullif(p_campaign->>'max_reward_per_day','')::numeric);
 for rule in select * from jsonb_array_elements(p_rules) loop
 if jsonb_typeof(rule)<>'object' or exists(select 1 from jsonb_object_keys(rule) k where k not in ('activity_type','metric','threshold','reward_amount','max_reward')) then raise exception 'Invalid rule fields'; end if;
 if coalesce(rule->>'activity_type','') not in ('running','walking','cycling','workout') or coalesce(rule->>'metric','') not in ('distance_km','active_minutes','steps','activity_count') then raise exception 'Invalid activity type or metric'; end if;
 if (rule->>'threshold') is null or (rule->>'reward_amount') is null or (rule->>'threshold')::numeric<=0 or (rule->>'reward_amount')::numeric<0 or (rule->>'threshold')::numeric>9007199254740991 or (rule->>'reward_amount')::numeric>9007199254740991 then raise exception 'Invalid rule values'; end if;
 if nullif(rule->>'max_reward','')::numeric<0 or nullif(rule->>'max_reward','')::numeric>9007199254740991 then raise exception 'Invalid rule cap'; end if;
 insert into public.reward_rules(id,campaign_id,activity_type,metric,threshold,reward_amount,max_reward)
 values(gen_random_uuid(),new_id,rule->>'activity_type',rule->>'metric',(rule->>'threshold')::numeric,(rule->>'reward_amount')::numeric,nullif(rule->>'max_reward','')::numeric);
 end loop;
 return new_id;
end $$;

create or replace function public.join_demo_campaign(p_campaign_id uuid)
returns uuid language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare c public.campaigns; participant public.campaign_participants; demo_user uuid;
begin
 select user_id into strict demo_user from public.demo_participant;
 select * into c from public.campaigns where id=p_campaign_id for update;
 if not found or c.status<>'active' or (c.start_date is not null and c.start_date::date>current_date) or (c.end_date is not null and c.end_date::date<current_date) then raise exception 'Challenge is not open'; end if;
 select * into participant from public.campaign_participants where campaign_id=c.id and user_id=demo_user;
 if found and participant.status='active' then return participant.id; end if;
 if c.audience not in ('public','community') then raise exception 'This challenge requires an invitation or employee eligibility'; end if;
 insert into public.campaign_participants(campaign_id,user_id) values(c.id,demo_user)
 on conflict(campaign_id,user_id) do update set status='active',joined_at=now() returning id into participant.id;
 return participant.id;
end $$;

create or replace function public.assign_demo_activity_campaign(p_activity_id uuid,p_campaign_id uuid)
returns void language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare a public.activities; c public.campaigns; demo_user uuid;
begin
 select user_id into strict demo_user from public.demo_participant;
 select * into a from public.activities where id=p_activity_id for update;
 if not found or a.user_id is distinct from demo_user or a.is_demo is not true then raise exception 'Demo activity not available'; end if;
 if exists(select 1 from public.rewards where activity_id=a.id) then raise exception 'An activity with a reward cannot change campaign'; end if;
 select * into c from public.campaigns where id=p_campaign_id for update;
 if not found or c.status<>'active' or (c.start_date is not null and c.start_date::date>current_date) or (c.end_date is not null and c.end_date::date<current_date) then raise exception 'Challenge is not open'; end if;
 if not exists(select 1 from public.campaign_participants where campaign_id=c.id and user_id=demo_user and status='active') then raise exception 'Join this challenge first'; end if;
 if not exists(select 1 from public.reward_rules where campaign_id=c.id and activity_type=lower(a.type)) then raise exception 'No rule matches this activity'; end if;
 update public.activities set campaign_id=c.id where id=a.id;
end $$;
create or replace function public.reserve_activity_reward(p_activity_id uuid)
returns setof public.rewards
language plpgsql security definer set search_path = '' set timezone='UTC'
as $$
declare
  a public.activities%rowtype;
  c public.campaigns%rowtype;
  rule public.reward_rules%rowtype;
  saved public.rewards%rowtype;
  score integer := 100;
  units numeric;
  eligible numeric;
  used_total numeric;
  used_today numeric;
begin
  select * into a from public.activities where id = p_activity_id for update;
  if not found then raise exception 'Activity not found' using errcode = 'P0002'; end if;
  if a.distance_meters is null or a.distance_meters < 0 or a.duration_seconds is null or a.duration_seconds <= 0 then
    raise exception 'Invalid activity measurements';
  end if;
  -- Recheck the existing verifyActivity rules inside the same locked transaction.
  if a.gps_available is not true then score := score - 20; end if;
  if a.avg_heart_rate is null then score := score - 10; end if;
  if (a.is_manual or lower(a.source) = 'manual') then score := score - 25; end if;
  if lower(a.type) = 'running' and (a.distance_meters::numeric / a.duration_seconds) * 3.6 > 25 then score := score - 50; end if;
  if score < 80 then raise exception 'Activity is not verified'; end if;
  select * into saved from public.rewards where activity_id = a.id;
  if found then return next saved; return; end if;
  select * into c from public.campaigns where id = a.campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if c.status <> 'active' or c.status is null then raise exception 'Campaign is not active'; end if;
  if (c.start_date is not null and c.start_date::date>current_date) or (c.end_date is not null and c.end_date::date<current_date) then raise exception 'Campaign is outside its dates'; end if;
  if not exists(select 1 from public.campaign_participants where campaign_id=c.id and user_id=a.user_id and status='active') then raise exception 'Join this challenge first'; end if;
  select * into strict rule from public.reward_rules
    where campaign_id = c.id and activity_type = lower(a.type) for share;
  if rule.threshold is null or rule.threshold <= 0 or rule.reward_amount is null or rule.reward_amount < 0 or rule.max_reward < 0 then
    raise exception 'Invalid reward rule';
  end if;
  -- Mirrors calculateReward: proportional distance, completed duration blocks, whole tokens.
  if rule.metric = 'distance_km' then units := (a.distance_meters::numeric / 1000) / rule.threshold;
  elsif rule.metric in ('duration_minutes','active_minutes') then units := floor((a.duration_seconds::numeric / 60) / rule.threshold);
  elsif rule.metric = 'steps' then units := floor(coalesce(a.steps,0)::numeric / rule.threshold);
  elsif rule.metric = 'activity_count' then units := floor(1::numeric / rule.threshold);
  else raise exception 'Unsupported reward metric'; end if;
  eligible := floor(units * rule.reward_amount);
  if rule.max_reward is not null then eligible := floor(least(eligible, rule.max_reward)); end if;
  if eligible <= 0 or eligible > 9007199254740991 or eligible::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'No valid payable reward';
  end if;
  -- All four statuses retain participant reservations. Day means UTC reservation day.
  select coalesce(sum(amount),0),coalesce(sum(amount) filter(where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0)
  into used_total,used_today from public.rewards where campaign_id=c.id and user_id=a.user_id and status in ('pending','processing','distributed','failed');
  if c.max_reward_per_participant is not null and used_total+eligible>c.max_reward_per_participant then raise exception 'Participant reward cap exceeded'; end if;
  if c.max_reward_per_day is not null and used_today+eligible>c.max_reward_per_day then raise exception 'Daily participant reward cap exceeded'; end if;
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

alter table public.organisations enable row level security;
alter table public.campaign_participants enable row level security;
alter table public.demo_participant enable row level security;
revoke all on public.organisations,public.campaign_participants,public.demo_participant from anon,authenticated;
revoke insert,update,delete on public.organisations,public.campaign_participants,public.demo_participant,public.campaigns,public.reward_rules from service_role;
grant select on public.organisations,public.campaign_participants,public.demo_participant to service_role;
revoke all on function public.create_sponsor_campaign(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.join_demo_campaign(uuid) from public,anon,authenticated;
revoke all on function public.assign_demo_activity_campaign(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_sponsor_campaign(jsonb,jsonb) to service_role;
grant execute on function public.join_demo_campaign(uuid) to service_role;
grant execute on function public.assign_demo_activity_campaign(uuid,uuid) to service_role;
create or replace function public.set_sponsor_campaign_status(p_campaign_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' set timezone='UTC' as $$
begin
 if p_status is null or p_status not in ('draft','active','completed','paused') then raise exception 'Invalid status'; end if;
 update public.campaigns set status=p_status where id=p_campaign_id;
 if not found then raise exception 'Campaign not found'; end if;
end $$;
revoke all on function public.set_sponsor_campaign_status(uuid,text) from public,anon,authenticated;
grant execute on function public.set_sponsor_campaign_status(uuid,text) to service_role;
commit;
