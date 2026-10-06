-- Run only after applying the unchanged v0 migration through SQL Editor.
-- CLI db push records this metadata automatically; SQL Editor does not.
-- This is operational bookkeeping, not a second application migration.
begin;

do $$
begin
  if to_regclass('public.prospects') is null
    or to_regclass('public.prospect_status_events') is null
    or to_regprocedure('career_radar_private.record_prospect_status()') is null then
    raise exception 'Apply the Career Radar v0 migration before registering its history';
  end if;
end;
$$;

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key
);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;
revoke all on schema supabase_migrations from public, anon, authenticated;
revoke all on supabase_migrations.schema_migrations from public, anon, authenticated;

insert into supabase_migrations.schema_migrations (version, name)
values ('20261006000000', 'career_radar_v0')
on conflict (version) do nothing;

commit;

select version, name from supabase_migrations.schema_migrations
where version = '20261006000000';
