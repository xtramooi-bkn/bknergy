-- Apply separately in Supabase SQL Editor. No activity or existing reward is reassigned.
begin;
alter table public.campaigns
  add column if not exists token text not null default 'BKNE',
  add column if not exists reward_pool numeric not null default 0,
  add column if not exists status text not null default 'active';
alter table public.activities add column if not exists campaign_id uuid references public.campaigns(id);
create table if not exists public.reward_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  activity_type text not null,
  metric text not null check (metric in ('distance_km', 'duration_minutes')),
  reward_amount numeric not null check (reward_amount >= 0),
  threshold numeric not null check (threshold > 0),
  max_reward numeric check (max_reward >= 0),
  unique (campaign_id, activity_type)
);
alter table public.reward_rules enable row level security;
revoke insert, update, delete on public.reward_rules from anon, authenticated;
grant usage on schema public to service_role;
grant select on public.campaigns, public.reward_rules, public.activities to service_role;
-- One example campaign; reruns do not overwrite existing settings.
do $$
declare target_campaign uuid;
begin
  if (select count(*) from public.campaigns where name = 'September Move Challenge') > 1 then
    raise exception 'Multiple September campaigns exist. Select one explicitly before seeding rules.';
  end if;
  select id into target_campaign from public.campaigns where name = 'September Move Challenge';
  if target_campaign is null then
    insert into public.campaigns (name, token, reward_pool, status)
      values ('September Move Challenge', 'BKNE', 10000, 'active') returning id into target_campaign;
  end if;
  insert into public.reward_rules (campaign_id, activity_type, metric, reward_amount, threshold, max_reward)
    values (target_campaign, 'running', 'distance_km', 10, 1, null),
           (target_campaign, 'walking', 'distance_km', 2, 1, null),
           (target_campaign, 'cycling', 'distance_km', 1, 1, null),
           (target_campaign, 'workout', 'duration_minutes', 25, 30, null)
    on conflict (campaign_id, activity_type) do nothing;
end $$;
commit;
-- Explicitly link intended activities after checking campaign and activity UUIDs:
-- update public.activities set campaign_id = '<campaign UUID>'
-- where id in ('<activity UUID>') and campaign_id is null;
-- Existing rewards retain their original campaign, amount, and status.
