-- Local implementation of Issue #1; hosted application requires separate approval.
begin;
create sequence career_radar_private.board_top_position;
alter table public.prospects add column board_position bigint not null default (-nextval('career_radar_private.board_top_position'));
-- Preserve the previous default as the initial manual order, including Applied dates.
with ranked as (
  select id, row_number() over (order by
    (status = 'applied' and applied_on is not null) desc,
    case when status = 'applied' then coalesce(applied_on, discovered_on, created_at::date) end desc nulls last,
    created_at desc, id) as position
  from public.prospects
)
update public.prospects p set board_position = r.position from ranked r where p.id = r.id;

create function career_radar_private.board_column(status text)
returns text language sql immutable set search_path = '' as $$
  select case
    when status in ('prospect','interested','applying') then 'prospects'
    when status = 'applied' then 'applied'
    when status in ('recruiter','interviewing','final','offer') then 'in-process'
    when status in ('passed','rejected','withdrawn','closed') then 'done'
  end;
$$;
-- Security definer supplies only the private sequence; callers cannot set positions.
create function career_radar_private.prepare_board_position()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.board_position := -nextval('career_radar_private.board_top_position');
  elsif career_radar_private.board_column(new.status) is distinct from career_radar_private.board_column(old.status) then
    new.board_position := -nextval('career_radar_private.board_top_position');
  end if;
  return new;
end;
$$;
-- Replace the sequence default with a harmless value: the trigger owns allocation.
alter table public.prospects alter column board_position set default 0;
create trigger prospects_board_position before insert or update of status on public.prospects
  for each row execute function career_radar_private.prepare_board_position();
create index prospects_board_order_idx on public.prospects(owner_id, board_position, created_at desc, id);

-- Atomic whole-column permutation, guarded against stale order/membership on another device.
-- Explicit owner checks are mandatory because this narrowly scoped RPC is a definer.
create function public.reorder_prospect_column(column_id text, expected_ids uuid[], ordered_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  actual_ids uuid[];
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if column_id not in ('prospects','applied','in-process','done') or column_id is null then
    raise exception 'Invalid board column' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  perform id from public.prospects where owner_id = caller
    and career_radar_private.board_column(status) = column_id order by id for update;
  select coalesce(array_agg(id order by board_position, created_at desc, id), '{}'::uuid[])
    into actual_ids from public.prospects where owner_id = caller
    and career_radar_private.board_column(status) = column_id;
  if expected_ids is distinct from actual_ids then
    raise exception 'Board order changed. Reload before reordering.' using errcode = '40001';
  end if;
  if ordered_ids is null or cardinality(ordered_ids) <> cardinality(actual_ids)
    or exists(select 1 from unnest(ordered_ids) x where x is null)
    or (select array_agg(x order by x) from unnest(ordered_ids) x)
      is distinct from (select array_agg(x order by x) from unnest(actual_ids) x) then
    raise exception 'Order must contain every card in this column exactly once' using errcode = '22023';
  end if;
  if ordered_ids = actual_ids then return; end if;
  update public.prospects p set board_position = o.position
    from unnest(ordered_ids) with ordinality o(id, position)
    where p.id = o.id and p.owner_id = caller and p.board_position is distinct from o.position;
end;
$$;
revoke all on function career_radar_private.board_column(text), career_radar_private.prepare_board_position() from public, anon, authenticated;
revoke all on function public.reorder_prospect_column(text, uuid[], uuid[]) from public, anon;
grant execute on function public.reorder_prospect_column(text, uuid[], uuid[]) to authenticated;
commit;
