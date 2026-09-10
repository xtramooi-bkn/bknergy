begin;
alter table public.rewards
 add column if not exists distributed_at timestamptz,
 add column if not exists last_error text,
 add column if not exists distribution_attempts integer not null default 0,
 add column if not exists processing_started_at timestamptz,
 add column if not exists distribution_attempt_id uuid;
create or replace function public.claim_reward_distribution(p_reward_id uuid)
returns setof public.rewards language plpgsql security definer set search_path = '' as $$
declare r public.rewards;
begin
 select * into r from public.rewards where id=p_reward_id for update;
 if not found then raise exception 'Reward not found'; end if;
 if r.status not in ('pending','failed') then raise exception 'Reward is already processing or distributed'; end if;
 return query update public.rewards set status='processing', distribution_attempts=distribution_attempts+1,
 processing_started_at=now(), distribution_attempt_id=gen_random_uuid(), last_error=null
 where id=p_reward_id returning *;
end $$;
create or replace function public.finish_reward_distribution(p_reward_id uuid,p_attempt_id uuid,p_outcome text,p_transaction_hash text default null,p_brickken_transaction_id text default null)
returns setof public.rewards language plpgsql security definer set search_path = '' as $$
begin
 if p_outcome not in ('not_connected','success','failed') or p_outcome is null then raise exception 'Invalid outcome'; end if;
 if p_outcome='success' and nullif(trim(p_transaction_hash),'') is null then raise exception 'Transaction hash required'; end if;
 return query update public.rewards set
 status=case p_outcome when 'success' then 'distributed' when 'failed' then 'failed' else 'pending' end,
 transaction_hash=case when p_outcome='success' then p_transaction_hash else transaction_hash end,
 brickken_transaction_id=case when p_outcome='success' then p_brickken_transaction_id else brickken_transaction_id end,
 distributed_at=case when p_outcome='success' then now() else distributed_at end,
 last_error=case p_outcome when 'not_connected' then 'Brickken not connected' when 'failed' then 'Distribution failed. Retry is available.' else null end,
 processing_started_at=null, distribution_attempt_id=null
 where id=p_reward_id and status='processing' and distribution_attempt_id=p_attempt_id returning *;
 if not found then raise exception 'Distribution attempt no longer owns reward'; end if;
end $$;
revoke all on function public.claim_reward_distribution(uuid) from public,anon,authenticated;
revoke all on function public.finish_reward_distribution(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_reward_distribution(uuid) to service_role;
grant execute on function public.finish_reward_distribution(uuid,uuid,text,text,text) to service_role;
-- No budget changes here. Processing claims never expire automatically.
-- Before live transfers: use reward ID as provider idempotency key and reconcile ambiguous outcomes.
commit;
