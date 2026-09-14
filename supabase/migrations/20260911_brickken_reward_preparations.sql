begin;

create table if not exists public.participant_reward_wallets (
 user_id uuid primary key references public.users(id) on delete cascade,
 wallet_address text not null unique check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.reward_transfer_preparations (
 reward_id uuid primary key references public.rewards(id) on delete cascade,
 attempt_id uuid not null,
 recipient_wallet text not null check (recipient_wallet ~ '^0x[a-fA-F0-9]{40}$'),
 amount numeric not null check (amount > 0 and amount = trunc(amount)),
 brickken_transaction_id text not null unique,
 unsigned_transactions jsonb not null,
 transaction_hash text,
 submission_started_at timestamptz,
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.rewards add column if not exists reconciliation_provenance text;

create or replace function public.save_reward_transfer_preparation(p_reward_id uuid,p_attempt_id uuid,p_recipient_wallet text,p_amount numeric,p_tx_id text,p_transactions jsonb)
returns public.reward_transfer_preparations language plpgsql security definer set search_path='' as $$
declare saved public.reward_transfer_preparations;
begin
 if p_recipient_wallet !~ '^0x[a-fA-F0-9]{40}$' or p_amount is null or p_amount<=0 or p_amount<>trunc(p_amount) or nullif(trim(p_tx_id),'') is null or p_transactions is null then raise exception 'Invalid prepared transfer'; end if;
 if not exists(select 1 from public.rewards r join public.participant_reward_wallets w on w.user_id=r.user_id where r.id=p_reward_id and r.status='processing' and r.distribution_attempt_id=p_attempt_id and r.amount=p_amount and lower(w.wallet_address)=lower(p_recipient_wallet)) then raise exception 'Reward is not owned by this preparation attempt and wallet binding'; end if;
 insert into public.reward_transfer_preparations(reward_id,attempt_id,recipient_wallet,amount,brickken_transaction_id,unsigned_transactions) values(p_reward_id,p_attempt_id,p_recipient_wallet,p_amount,p_tx_id,p_transactions) on conflict(reward_id) do nothing returning * into saved;
 if not found then raise exception 'Reward already has a prepared transfer'; end if;
 return saved;
end $$;

-- Historical reconciliation may take over a stranded processing attempt only when
-- there is no submitted or ambiguously submitted provider transaction to race.
create or replace function public.claim_reward_reconciliation(p_reward_id uuid)
returns public.rewards language plpgsql security definer set search_path='' as $$
declare claimed public.rewards;
begin
 select * into claimed from public.rewards where id=p_reward_id for update;
 if not found then raise exception 'Reward not found'; end if;
 if claimed.status='distributed' then raise exception 'Reward is already distributed'; end if;
 if claimed.status<>'processing' then raise exception 'Historical reconciliation requires an existing processing reward'; end if;
 if claimed.distribution_attempt_id is null then raise exception 'Processing reward has no distribution attempt'; end if;
 if exists(select 1 from public.reward_transfer_preparations p where p.reward_id=claimed.id and (p.transaction_hash is not null or p.submission_started_at is not null)) then
   raise exception 'Reward has an active or unresolved blockchain submission';
 end if;
 return claimed;
end $$;
create or replace function public.claim_reward_transfer_submission(p_reward_id uuid,p_attempt_id uuid,p_tx_id text)
returns public.reward_transfer_preparations language plpgsql security definer set search_path='' as $$
declare saved public.reward_transfer_preparations;
begin
 update public.reward_transfer_preparations p set submission_started_at=now(),updated_at=now()
 where p.reward_id=p_reward_id and p.attempt_id=p_attempt_id and p.brickken_transaction_id=p_tx_id and p.transaction_hash is null and p.submission_started_at is null
 and exists(select 1 from public.rewards r where r.id=p.reward_id and r.status='processing' and r.distribution_attempt_id=p_attempt_id)
 returning p.* into saved;
 if not found then raise exception 'Prepared transfer is already claimed, submitted, or does not match'; end if;
 return saved;
end $$;

create or replace function public.release_reward_transfer_submission(p_reward_id uuid,p_attempt_id uuid,p_tx_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.reward_transfer_preparations set submission_started_at=null,updated_at=now() where reward_id=p_reward_id and attempt_id=p_attempt_id and brickken_transaction_id=p_tx_id and transaction_hash is null;
end $$;

-- Recovery is allowed only after the server has independently confirmed Brickken
-- remains pre-submit. This RPC only releases the matching local claim.
create or replace function public.release_reward_transfer_submission_claim(p_reward_id uuid,p_attempt_id uuid,p_tx_id text)
returns public.reward_transfer_preparations language plpgsql security definer set search_path='' as $$
declare released public.reward_transfer_preparations;
begin
 update public.reward_transfer_preparations p set submission_started_at=null,updated_at=now()
 where p.reward_id=p_reward_id and p.attempt_id=p_attempt_id and p.brickken_transaction_id=p_tx_id
   and p.submission_started_at is not null and p.submitted_at is null and p.transaction_hash is null
   and exists(select 1 from public.rewards r where r.id=p.reward_id and r.status='processing' and r.distribution_attempt_id=p_attempt_id)
 returning p.* into released;
 if not found then raise exception 'Submission claim is not safely releasable'; end if;
 return released;
end $$;
create or replace function public.record_reward_reconciliation_provenance(p_reward_id uuid,p_transaction_hash text,p_tx_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.rewards set reconciliation_provenance='manual_historical_confirmed'
 where id=p_reward_id and status='distributed' and transaction_hash=p_transaction_hash and brickken_transaction_id=p_tx_id;
 if not found then raise exception 'Distributed reward does not match reconciliation evidence'; end if;
end $$;
create or replace function public.record_reward_transfer_submission(p_reward_id uuid,p_attempt_id uuid,p_tx_id text,p_tx_hash text)
returns public.reward_transfer_preparations language plpgsql security definer set search_path='' as $$
declare saved public.reward_transfer_preparations;
begin
 if nullif(trim(p_tx_hash),'') is null then raise exception 'Transaction hash required'; end if;
 update public.reward_transfer_preparations set transaction_hash=p_tx_hash,submitted_at=coalesce(submitted_at,now()),updated_at=now() where reward_id=p_reward_id and attempt_id=p_attempt_id and brickken_transaction_id=p_tx_id and transaction_hash is null and submission_started_at is not null returning * into saved;
 if not found then raise exception 'Prepared transfer is missing, unclaimed, already submitted, or does not match'; end if;
 return saved;
end $$;

revoke all on public.reward_transfer_preparations,public.participant_reward_wallets from anon,authenticated,service_role;
grant select on public.reward_transfer_preparations,public.participant_reward_wallets to service_role;
revoke all on function public.save_reward_transfer_preparation(uuid,uuid,text,numeric,text,jsonb),public.claim_reward_reconciliation(uuid),public.claim_reward_transfer_submission(uuid,uuid,text),public.release_reward_transfer_submission(uuid,uuid,text),public.release_reward_transfer_submission_claim(uuid,uuid,text),public.record_reward_transfer_submission(uuid,uuid,text,text),public.record_reward_reconciliation_provenance(uuid,text,text) from public,anon,authenticated;
grant execute on function public.save_reward_transfer_preparation(uuid,uuid,text,numeric,text,jsonb),public.claim_reward_reconciliation(uuid),public.claim_reward_transfer_submission(uuid,uuid,text),public.release_reward_transfer_submission(uuid,uuid,text),public.release_reward_transfer_submission_claim(uuid,uuid,text),public.record_reward_transfer_submission(uuid,uuid,text,text),public.record_reward_reconciliation_provenance(uuid,text,text) to service_role;
commit;


