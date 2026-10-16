begin;
create table public.radar_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  identity_key text not null check (octet_length(identity_key) between 1 and 2048),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 32768
    and snapshot ?& array['facts','claims','assessment','verification','sources','original_url','discovery_url','profile_revision','searched_at']
    and snapshot - array['facts','claims','assessment','verification','sources','original_url','discovery_url','profile_revision','searched_at'] = '{}'::jsonb
    and jsonb_typeof(snapshot->'facts') = 'object' and jsonb_typeof(snapshot->'claims') = 'object'
    and (snapshot->'facts') - array['company','job_title','location','remote_eligibility','compensation_text'] = '{}'::jsonb
    and (snapshot->'claims') - array['company','job_title','location','remote_eligibility','compensation_text'] = '{}'::jsonb
    and jsonb_typeof(snapshot->'assessment') = 'object'
    and (snapshot->'assessment') - array['why_fit','concerns_or_unknowns','wildcard_rationale'] = '{}'::jsonb
    and jsonb_typeof(snapshot->'verification') = 'object'
    and (snapshot->'verification') - array['availability','consultation','reason','checked_at','application'] = '{}'::jsonb
    and jsonb_typeof(snapshot->'verification'->'application') = 'object'
    and (snapshot->'verification'->'application') - array['status','url'] = '{}'::jsonb
    and jsonb_typeof(snapshot->'sources') = 'array'
  ),
  decision text not null default 'new' check (decision in ('new','accepted','passed')),
  pass_reason text check (pass_reason in ('compensation','scope','management','industry','location','work_type','already_considered','other')),
  pass_note text check (length(pass_note) <= 500),
  decided_at timestamptz,
  prospect_id uuid references public.prospects(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(owner_id,identity_key),
  check (decision = 'passed' or (pass_reason is null and pass_note is null)),
  check ((decision = 'new') = (decided_at is null))
);
-- Allow the handoff to assert its originating owner; existing prospect RLS still checks auth.uid().
grant insert(owner_id) on public.prospects to authenticated;
alter table public.radar_opportunities enable row level security;
revoke all on public.radar_opportunities from public,anon,authenticated;
grant select on public.radar_opportunities to authenticated;
grant insert(id,owner_id,identity_key,snapshot) on public.radar_opportunities to authenticated;
grant update(snapshot,decision,pass_reason,pass_note,prospect_id) on public.radar_opportunities to authenticated;
create policy radar_opportunities_select_own on public.radar_opportunities for select to authenticated using (owner_id=(select auth.uid()));
create policy radar_opportunities_insert_own on public.radar_opportunities for insert to authenticated with check (owner_id=(select auth.uid()));
create policy radar_opportunities_update_own on public.radar_opportunities for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create function career_radar_private.prepare_radar_opportunity_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id or new.identity_key is distinct from old.identity_key or new.created_at is distinct from old.created_at then
    raise exception 'Opportunity identity and ownership are immutable' using errcode='23514';
  end if;
  if new.prospect_id is distinct from old.prospect_id then
    if old.prospect_id is not null or new.prospect_id is null or new.decision <> 'accepted' or not exists (
      select 1 from public.prospects p where p.id=new.prospect_id and p.owner_id=new.owner_id
    ) then raise exception 'Link an owned prospect only after explicit acceptance' using errcode='23514'; end if;
  end if;
  new.decided_at := case when new.decision='new' then null when new.decision is distinct from old.decision then clock_timestamp() else old.decided_at end;
  new.last_seen_at := case when new.snapshot is distinct from old.snapshot then clock_timestamp() else old.last_seen_at end;
  new.updated_at := greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
  return new;
end;
$$;
revoke all on function career_radar_private.prepare_radar_opportunity_update() from public,anon,authenticated;
create trigger radar_opportunities_prepare_update before update on public.radar_opportunities for each row execute function career_radar_private.prepare_radar_opportunity_update();
commit;
