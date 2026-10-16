begin;
-- Explicit settings and future learned signals have distinct columns and grants.
create table public.career_profiles (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete restrict,
  explicit_profile jsonb not null check (jsonb_typeof(explicit_profile) = 'object' and explicit_profile @> '{"schema_version":1}'::jsonb),
  inferred_signals jsonb not null default '[]'::jsonb check (jsonb_typeof(inferred_signals) = 'array'),
  reviewed_at timestamptz not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.career_profiles enable row level security;
revoke all on public.career_profiles from public, anon, authenticated;
grant select on public.career_profiles to authenticated;
grant insert (explicit_profile, reviewed_at) on public.career_profiles to authenticated;
grant update (explicit_profile, reviewed_at) on public.career_profiles to authenticated;
create policy career_profiles_select_own on public.career_profiles for select to authenticated
  using (owner_id = (select auth.uid()));
create policy career_profiles_insert_own on public.career_profiles for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy career_profiles_update_own on public.career_profiles for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create function career_radar_private.prepare_career_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
    raise exception 'Profile ownership and creation time are immutable' using errcode = '23514';
  end if;
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  -- Signal-only updates cannot invalidate approval or imply an explicit edit.
  new.revision := old.revision + case when new.explicit_profile is distinct from old.explicit_profile then 1 else 0 end;
  new.reviewed_at := case when new.explicit_profile is distinct from old.explicit_profile then clock_timestamp() else old.reviewed_at end;
  return new;
end;
$$;
revoke all on function career_radar_private.prepare_career_profile_update() from public, anon, authenticated;
create trigger career_profiles_prepare_update before update on public.career_profiles
  for each row execute function career_radar_private.prepare_career_profile_update();
commit;
