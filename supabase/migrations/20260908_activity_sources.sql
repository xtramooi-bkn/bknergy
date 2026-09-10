-- Existing MVP activity records are simulated; preserve manual verification penalties.
begin;
alter table public.activities
  add column if not exists original_source text,
  add column if not exists is_demo boolean not null default true,
  add column if not exists is_manual boolean not null default false;
update public.activities set
  is_manual = is_manual or lower(source) = 'manual',
  original_source = coalesce(original_source, case lower(source)
    when 'garmin' then 'Garmin-style activity' when 'strava' then 'Strava-style activity'
    when 'manual' then 'Manual-entry activity' when 'demo' then null else source || '-style activity' end),
  source = case when is_demo then 'demo' else lower(replace(source, ' ', '_')) end;
alter table public.activities alter column source set default 'demo';
alter table public.activities add constraint activities_source_values
  check (source in ('demo','garmin','strava','apple_health','health_connect','manual'));
-- Keep database-side verification consistent without altering budget locking or deduction.
do $$
declare definition text;
begin
  if to_regprocedure('public.reserve_activity_reward(uuid)') is null then
    raise exception 'Apply 20260908_atomic_reward_budgets.sql before this migration';
  else
    select pg_get_functiondef('public.reserve_activity_reward(uuid)'::regprocedure) into definition;
    if position('a.is_manual' in definition) = 0 then
      if position('lower(a.source) = ''manual''' in definition) = 0 then
        raise exception 'Unexpected reservation function; review manual-source verification before migration';
      end if;
      definition := replace(definition, 'lower(a.source) = ''manual''', '(a.is_manual or lower(a.source) = ''manual'')');
      execute definition;
    end if;
  end if;
end $$;
commit;
-- Future adapters explicitly set is_demo=false for genuinely imported data.
-- A provider source name alone never represents connection status.
