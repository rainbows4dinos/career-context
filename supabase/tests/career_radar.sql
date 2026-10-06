-- Run against a disposable migrated database, not the live project.
-- Plain SQL assertions: no pgTAP dependency. All synthetic fixtures roll back.
begin;

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.prospects(id, company, title) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Synthetic Company', 'Staff Designer');

do $$
declare before_time timestamptz; after_time timestamptz; affected integer;
begin
  if (select owner_id from public.prospects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> auth.uid() then
    raise exception 'Owner default failed';
  end if;
  if (select count(*) from public.prospect_status_events) <> 1
    or not exists (select 1 from public.prospect_status_events where from_status is null and to_status = 'prospect') then
    raise exception 'Initial event missing or incorrect';
  end if;

  select updated_at into before_time from public.prospects;
  update public.prospects set notes = 'A manual note', personal_interest = 5, overall_assessment = 2,
    connections = '[{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","name":"Synthetic Contact"}]'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and updated_at = before_time;
  select updated_at into after_time from public.prospects;
  if after_time <= before_time then raise exception 'Revision did not advance'; end if;
  if (select count(*) from public.prospect_status_events) <> 1 then raise exception 'Details created history'; end if;
  if not exists (select 1 from public.prospects where personal_interest = 5 and overall_assessment = 2 and jsonb_array_length(connections) = 1) then
    raise exception 'Assessment/connection edits did not persist independently';
  end if;

  update public.prospects set title = 'Stale title' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and updated_at = before_time;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale edit was accepted'; end if;

  update public.prospects set status = 'applied', applied_on = '2026-10-01' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  update public.prospects set status = 'applied' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  update public.prospects set status = 'interested' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if (select count(*) from public.prospect_status_events) <> 3 then raise exception 'History count incorrect'; end if;
  if not exists (select 1 from public.prospect_status_events where from_status = 'prospect' and to_status = 'applied')
    or not exists (select 1 from public.prospect_status_events where from_status = 'applied' and to_status = 'interested') then
    raise exception 'Skipped/reopened transitions not recorded';
  end if;
  if (select applied_on from public.prospects) <> '2026-10-01'::date then raise exception 'Application date changed with status'; end if;

  begin
    update public.prospects set systems_fit = 0;
    raise exception 'Invalid score accepted';
  exception when check_violation then null; end;
  begin
    update public.prospects set connections = '{}'::jsonb;
    raise exception 'Non-array connections accepted';
  exception when check_violation then null; end;
  begin
    update public.prospects set title = '   ';
    raise exception 'Blank title accepted';
  exception when check_violation then null; end;
  begin
    update public.prospects set status = 'invented';
    raise exception 'Invalid status accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.prospect_status_events) <> 3 then raise exception 'Failed update left history'; end if;
  begin
    update public.prospects set owner_id = '22222222-2222-4222-8222-222222222222';
    raise exception 'Owner edit permitted';
  exception when insufficient_privilege then null; end;
  begin
    update public.prospects set updated_at = now();
    raise exception 'Revision spoof permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.prospect_status_events(prospect_id, to_status) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'offer');
    raise exception 'Direct history insert permitted';
  exception when insufficient_privilege then null; end;
  begin
    update public.prospect_status_events set to_status = 'closed';
    raise exception 'History edit permitted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.prospect_status_events;
    raise exception 'History delete permitted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.prospects;
    raise exception 'Prospect delete permitted';
  exception when insufficient_privilege then null; end;
  begin
    perform career_radar_private.record_prospect_status();
    raise exception 'Private function callable';
  exception when insufficient_privilege then null; end;
end;
$$;

-- A second authenticated user sees none of the first user's private records.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$
declare affected integer;
begin
  if exists (select 1 from public.prospects) or exists (select 1 from public.prospect_status_events) then
    raise exception 'Cross-owner read leaked';
  end if;
  update public.prospects set notes = 'Other user' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner edit accepted'; end if;
end;
$$;
insert into public.prospects(id, company, title, status) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Second Synthetic Company', 'Lead Designer', 'interviewing');
do $$ begin
  if (select count(*) from public.prospects) <> 1 or not exists (
    select 1 from public.prospect_status_events where from_status is null and to_status = 'interviewing'
  ) then raise exception 'Second owner initial status failed'; end if;
end; $$;

-- Temporarily grant owner insertion to prove RLS independently of column grants.
reset role;
grant insert(owner_id) on public.prospects to authenticated;
set local role authenticated;
do $$ begin
  begin
    insert into public.prospects(company, title, owner_id) values ('Spoof', 'Spoof', '11111111-1111-4111-8111-111111111111');
    raise exception 'RLS owner spoof accepted';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
revoke insert(owner_id) on public.prospects from authenticated;

-- If writing history fails, the parent transition must roll back too.
alter table public.prospect_status_events add constraint test_reject_offer check (to_status <> 'offer');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$ begin
  begin
    update public.prospects set status = 'offer' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'History failure did not abort transition';
  exception when check_violation then null; end;
  if (select status from public.prospects) <> 'interested'
    or (select count(*) from public.prospect_status_events) <> 3 then
    raise exception 'History and current state diverged';
  end if;
end; $$;
reset role;
alter table public.prospect_status_events drop constraint test_reject_offer;

-- The immutable-owner trigger also protects privileged updates.
do $$ begin
  begin
    update public.prospects set owner_id = '22222222-2222-4222-8222-222222222222'
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Privileged owner change accepted';
  exception when check_violation then null; end;
  begin
    delete from public.prospects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Parent deletion lost history';
  exception when restrict_violation or foreign_key_violation then null; end;
end; $$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin
    perform * from public.prospects;
    raise exception 'Anonymous read permitted';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.prospect_status_events;
    raise exception 'Anonymous history read permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.prospects(company, title) values ('Anonymous', 'Anonymous');
    raise exception 'Anonymous write permitted';
  exception when insufficient_privilege then null; end;
end; $$;

reset role;
rollback;
