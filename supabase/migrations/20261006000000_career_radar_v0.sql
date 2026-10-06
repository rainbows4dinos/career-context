-- Career Radar owns job-search state only. Career context remains in the repo.
begin;

create schema if not exists career_radar_private;
revoke all on schema career_radar_private from public, anon, authenticated;

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  company text not null check (length(btrim(company)) > 0),
  title text not null check (length(btrim(title)) > 0),
  job_url text,
  source text,
  location text,
  work_arrangement text check (work_arrangement in ('remote', 'hybrid', 'onsite', 'flexible')),
  employment_type text,
  compensation_text text,
  job_description text,
  posted_on date,
  discovered_on date,
  applied_on date,
  status text not null default 'prospect' check (status in (
    'prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing',
    'final', 'offer', 'passed', 'rejected', 'withdrawn', 'closed'
  )),
  notes text,
  connections jsonb not null default '[]'::jsonb check (jsonb_typeof(connections) = 'array'),
  experience_fit smallint check (experience_fit between 1 and 5),
  level_fit smallint check (level_fit between 1 and 5),
  compensation_fit smallint check (compensation_fit between 1 and 5),
  consumer_fit smallint check (consumer_fit between 1 and 5),
  domain_fit smallint check (domain_fit between 1 and 5),
  craft_interaction_fit smallint check (craft_interaction_fit between 1 and 5),
  systems_fit smallint check (systems_fit between 1 and 5),
  work_style_fit smallint check (work_style_fit between 1 and 5),
  logistics_fit smallint check (logistics_fit between 1 and 5),
  relationship_strength smallint check (relationship_strength between 1 and 5),
  overall_assessment smallint check (overall_assessment between 1 and 5),
  personal_interest smallint check (personal_interest between 1 and 5),
  assessment_rationale text,
  assessment_concerns text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.prospect_status_events (
  id bigint generated always as identity primary key,
  prospect_id uuid not null references public.prospects(id) on delete restrict,
  from_status text check (from_status in (
    'prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing',
    'final', 'offer', 'passed', 'rejected', 'withdrawn', 'closed'
  )),
  to_status text not null check (to_status in (
    'prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing',
    'final', 'offer', 'passed', 'rejected', 'withdrawn', 'closed'
  )),
  recorded_at timestamptz not null default clock_timestamp(),
  check (from_status is null or from_status <> to_status)
);

create index prospects_owner_id_idx on public.prospects(owner_id);
create index prospect_status_events_prospect_id_id_idx
  on public.prospect_status_events(prospect_id, id);

alter table public.prospects enable row level security;
alter table public.prospect_status_events enable row level security;

-- Remove inherited API grants, then expose only the operations v0 needs.
revoke all on public.prospects, public.prospect_status_events from public, anon, authenticated;
revoke all on sequence public.prospect_status_events_id_seq from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.prospects, public.prospect_status_events to authenticated;
grant insert (
  id, company, title, job_url, source, location, work_arrangement, employment_type,
  compensation_text, job_description, posted_on, discovered_on, applied_on,
  status, notes, connections, experience_fit, level_fit, compensation_fit,
  consumer_fit, domain_fit, craft_interaction_fit, systems_fit, work_style_fit,
  logistics_fit, relationship_strength, overall_assessment, personal_interest,
  assessment_rationale, assessment_concerns
) on public.prospects to authenticated;
grant update (
  company, title, job_url, source, location, work_arrangement, employment_type,
  compensation_text, job_description, posted_on, discovered_on, applied_on,
  status, notes, connections, experience_fit, level_fit, compensation_fit,
  consumer_fit, domain_fit, craft_interaction_fit, systems_fit, work_style_fit,
  logistics_fit, relationship_strength, overall_assessment, personal_interest,
  assessment_rationale, assessment_concerns
) on public.prospects to authenticated;

create policy prospects_select_own on public.prospects
  for select to authenticated using (owner_id = (select auth.uid()));
create policy prospects_insert_own on public.prospects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy prospects_update_own on public.prospects
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy prospect_status_events_select_own on public.prospect_status_events
  for select to authenticated using (
    exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.owner_id = (select auth.uid())
    )
  );

create function career_radar_private.prepare_prospect_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.owner_id is distinct from old.owner_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Prospect identity, ownership and creation time are immutable'
      using errcode = '23514';
  end if;
  -- Strictly increases even for multiple writes in one transaction.
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

create function career_radar_private.record_prospect_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.prospect_status_events (prospect_id, from_status, to_status)
      values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.prospect_status_events (prospect_id, from_status, to_status)
      values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

revoke all on function career_radar_private.prepare_prospect_update() from public, anon, authenticated;
revoke all on function career_radar_private.record_prospect_status() from public, anon, authenticated;

create trigger prospects_prepare_update before update on public.prospects
  for each row execute function career_radar_private.prepare_prospect_update();
create trigger prospects_record_status after insert or update of status on public.prospects
  for each row execute function career_radar_private.record_prospect_status();

commit;
