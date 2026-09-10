-- Apply after sponsor campaigns. All redemption destinations are demo placeholders.
begin;
alter table public.campaigns add column if not exists redemption_bkne_per_eur numeric;
alter table public.campaigns add constraint campaigns_redemption_conversion check(redemption_bkne_per_eur is null or (redemption_bkne_per_eur>0 and redemption_bkne_per_eur<=9007199254740991));
create table public.redemptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
 campaign_id uuid not null references public.campaigns(id), request_id uuid not null,
 amount_bkne numeric not null check(amount_bkne>0 and amount_bkne=trunc(amount_bkne) and amount_bkne<=9007199254740991),
 redemption_type text not null check(redemption_type in ('cash','donation','partner_store','wellness','hold')),
 destination text not null, euro_value numeric check(euro_value>=0 and euro_value<=9007199254740991),
 conversion_bkne_per_eur numeric,
 status text not null default 'requested' check(status in ('requested','processing','completed','failed')),
 created_at timestamptz not null default now(), unique(user_id,request_id)
);
create index redemptions_user_campaign on public.redemptions(user_id,campaign_id);
alter table public.redemptions enable row level security;
revoke all on public.redemptions from public,anon,authenticated;
revoke insert,update,delete on public.redemptions from service_role;
grant select on public.redemptions to service_role;

create or replace function public.set_campaign_redemption_value(p_campaign_id uuid,p_bkne_per_eur numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_bkne_per_eur is not null and (p_bkne_per_eur<=0 or p_bkne_per_eur>9007199254740991) then raise exception 'Invalid conversion value'; end if;
 update public.campaigns set redemption_bkne_per_eur=p_bkne_per_eur where id=p_campaign_id;
 if not found then raise exception 'Campaign not found'; end if;
end $$;

create or replace function public.request_demo_redemption(p_campaign_id uuid,p_request_id uuid,p_amount_bkne numeric,p_type text,p_destination text)
returns public.redemptions language plpgsql security definer set search_path='' as $$
declare demo_user uuid; saved public.redemptions; earned numeric; committed numeric; rate numeric; euros numeric;
begin
 select user_id into strict demo_user from public.demo_participant;
 -- A stable participant lock serializes every redemption request, including different request IDs.
 perform pg_advisory_xact_lock(hashtextextended(demo_user::text,0));
 if p_request_id is null or p_amount_bkne is null or p_amount_bkne<=0 or p_amount_bkne<>trunc(p_amount_bkne) or p_amount_bkne>9007199254740991 then raise exception 'Invalid redemption amount or request ID'; end if;
 select * into saved from public.redemptions where user_id=demo_user and request_id=p_request_id;
 if found then
 if saved.campaign_id is distinct from p_campaign_id or saved.amount_bkne is distinct from p_amount_bkne or saved.redemption_type is distinct from p_type or saved.destination is distinct from p_destination then raise exception 'Request ID already used for different redemption'; end if;
 return saved;
 end if;
 if p_type is null or p_destination is null or not (
 (p_type='cash' and p_destination='demo_cash') or
 (p_type='donation' and p_destination in ('demo_youth_sport','demo_community_health','demo_active_access')) or
 (p_type='partner_store' and p_destination in ('sports_voucher','healthy_lunch_voucher','race_entry')) or
 (p_type='wellness' and p_destination in ('gym_contribution','sports_voucher','race_entry')) or
 (p_type='hold' and p_destination='keep_bkne')) then raise exception 'Invalid redemption destination'; end if;
 select redemption_bkne_per_eur into rate from public.campaigns where id=p_campaign_id for share;
 if not found then raise exception 'Campaign not found'; end if;
 select coalesce(sum(amount),0) into earned from public.rewards where user_id=demo_user and campaign_id=p_campaign_id and status='distributed';
 -- No automatic release for failed requests: an explicit reconciled refund is a future operation.
 select coalesce(sum(amount_bkne),0) into committed from public.redemptions where user_id=demo_user and campaign_id=p_campaign_id and redemption_type<>'hold';
 if p_amount_bkne>greatest(0,earned-committed) then raise exception 'Insufficient distributed BKNE balance'; end if;
 if p_type<>'hold' then
 if rate is null then raise exception 'Campaign has no funded reward conversion value'; end if;
 euros:=round(p_amount_bkne/rate,2);
 if euros<=0 or euros>9007199254740991 then raise exception 'Reward value is outside supported range'; end if;
 end if;
 insert into public.redemptions(user_id,campaign_id,request_id,amount_bkne,redemption_type,destination,euro_value,conversion_bkne_per_eur)
 values(demo_user,p_campaign_id,p_request_id,p_amount_bkne,p_type,p_destination,euros,case when p_type='hold' then null else rate end) returning * into saved;
 return saved;
end $$;

-- One database snapshot for balances, campaign progress and recent request history.
create or replace function public.get_demo_reward_overview()
returns jsonb language sql stable security definer set search_path='' as $$
 with identity as (select user_id from public.demo_participant),
 campaign_balances as (
 select c.id campaign_id,c.redemption_bkne_per_eur,
 r.earned,r.pending,r.processing,r.failed,r.distributed,r.rewarded_activities,
 d.committed,greatest(0,r.distributed-d.committed) available,
 a.activity_count,a.distance_meters,a.active_minutes,a.steps
 from public.campaigns c cross join identity i
 cross join lateral(select coalesce(sum(amount),0) earned,
 coalesce(sum(amount) filter(where status='pending'),0) pending,
 coalesce(sum(amount) filter(where status='processing'),0) processing,
 coalesce(sum(amount) filter(where status='failed'),0) failed,
 coalesce(sum(amount) filter(where status='distributed'),0) distributed,count(*) rewarded_activities
 from public.rewards where user_id=i.user_id and campaign_id=c.id) r
 cross join lateral(select coalesce(sum(amount_bkne),0) committed from public.redemptions where user_id=i.user_id and campaign_id=c.id and redemption_type<>'hold') d
 cross join lateral(select count(*) activity_count,coalesce(sum(distance_meters),0) distance_meters,
 coalesce(sum(duration_seconds),0)/60 active_minutes,coalesce(sum(steps),0) steps
 from public.activities where user_id=i.user_id and campaign_id=c.id) a
 where r.earned>0 or exists(select 1 from public.campaign_participants p where p.user_id=i.user_id and p.campaign_id=c.id)
 ), totals as (
 select coalesce(sum(amount),0) earned,
 coalesce(sum(amount) filter(where status='pending'),0) pending,
 coalesce(sum(amount) filter(where status='processing'),0) processing,
 coalesce(sum(amount) filter(where status='failed'),0) failed,
 coalesce(sum(amount) filter(where status='distributed'),0) distributed
 from public.rewards where user_id=(select user_id from identity)
 )
 select jsonb_build_object('totals',(select to_jsonb(t) from totals t),
 'available',coalesce((select sum(available) from campaign_balances),0),
 'campaigns',coalesce((select jsonb_agg(to_jsonb(b) order by campaign_id) from campaign_balances b),'[]'::jsonb),
 'redemptions',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc,id) from
 (select * from public.redemptions where user_id=(select user_id from identity) order by created_at desc,id limit 100) x),'[]'::jsonb));
$$;
revoke all on function public.set_campaign_redemption_value(uuid,numeric) from public,anon,authenticated;
revoke all on function public.request_demo_redemption(uuid,uuid,numeric,text,text) from public,anon,authenticated;
revoke all on function public.get_demo_reward_overview() from public,anon,authenticated;
grant execute on function public.set_campaign_redemption_value(uuid,numeric) to service_role;
grant execute on function public.request_demo_redemption(uuid,uuid,numeric,text,text) to service_role;
grant execute on function public.get_demo_reward_overview() to service_role;
commit;
