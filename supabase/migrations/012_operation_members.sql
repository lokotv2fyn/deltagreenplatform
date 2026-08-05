-- Migration 012: operation_members
-- Tracks which players are assigned to which operations.
-- Players see only their assigned operations' boards.
-- Handlers can manage assignments and create parallel active operations.

-- ─── Table ───────────────────────────────────────────────────────────────────

create table operation_members (
  operation_id uuid not null references operations(id) on delete cascade,
  user_id      uuid not null references profiles(id)  on delete cascade,
  primary key (operation_id, user_id)
);

alter table operation_members enable row level security;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

-- Handlers of the group can see all memberships for their group's operations
create policy "operation_members_select_handler"
  on operation_members for select using (
    exists (
      select 1 from operations o
      join group_members gm on gm.group_id = o.group_id
      where o.id = operation_members.operation_id
        and gm.user_id = auth.uid()
        and gm.role = 'handler'
    )
  );

-- Players can see their own memberships
create policy "operation_members_select_self"
  on operation_members for select using (
    user_id = auth.uid()
  );

-- Handlers can insert/delete memberships for their group's operations
create policy "operation_members_insert_handler"
  on operation_members for insert with check (
    exists (
      select 1 from operations o
      join group_members gm on gm.group_id = o.group_id
      where o.id = operation_members.operation_id
        and gm.user_id = auth.uid()
        and gm.role = 'handler'
    )
  );

create policy "operation_members_delete_handler"
  on operation_members for delete using (
    exists (
      select 1 from operations o
      join group_members gm on gm.group_id = o.group_id
      where o.id = operation_members.operation_id
        and gm.user_id = auth.uid()
        and gm.role = 'handler'
    )
  );

-- ─── RPCs ─────────────────────────────────────────────────────────────────────

-- Assign a player to an operation (handler only)
create or replace function assign_player_to_operation(p_operation_id uuid, p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from operations o
    join group_members gm on gm.group_id = o.group_id
    where o.id = p_operation_id
      and gm.user_id = auth.uid()
      and gm.role = 'handler'
  ) then
    raise exception 'not_handler';
  end if;

  insert into operation_members (operation_id, user_id)
  values (p_operation_id, p_user_id)
  on conflict do nothing;
end;
$$;

-- Remove a player from an operation (handler only)
create or replace function remove_player_from_operation(p_operation_id uuid, p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from operations o
    join group_members gm on gm.group_id = o.group_id
    where o.id = p_operation_id
      and gm.user_id = auth.uid()
      and gm.role = 'handler'
  ) then
    raise exception 'not_handler';
  end if;

  delete from operation_members
  where operation_id = p_operation_id and user_id = p_user_id;
end;
$$;

-- Create a new operation without archiving the current one (handler only)
-- Updates groups.current_operation_id to the new operation for the handler's view.
create or replace function create_operation(p_group_id uuid, p_name text)
returns uuid language plpgsql security definer as $$
declare
  v_op_id uuid;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'handler'
  ) then
    raise exception 'not_handler';
  end if;

  insert into operations (group_id, name)
  values (p_group_id, p_name)
  returning id into v_op_id;

  update groups set current_operation_id = v_op_id where id = p_group_id;

  return v_op_id;
end;
$$;

-- Switch handler's current operation view without archiving
create or replace function set_current_operation(p_group_id uuid, p_operation_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'handler'
  ) then
    raise exception 'not_handler';
  end if;

  -- Verify the operation belongs to this group
  if not exists (
    select 1 from operations
    where id = p_operation_id and group_id = p_group_id
  ) then
    raise exception 'operation_not_found';
  end if;

  update groups set current_operation_id = p_operation_id where id = p_group_id;
end;
$$;

-- ─── Update cards SELECT policy ───────────────────────────────────────────────
-- Players now only see revealed cards from their assigned operations.

drop policy if exists "cards_select" on cards;

create policy "cards_select" on cards for select using (
  -- Handlers see all cards in their groups
  exists (
    select 1 from group_members gm
    where gm.group_id = cards.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'handler'
  )
  -- Players see their own cards regardless of reveal state
  OR cards.created_by = auth.uid()
  -- Players see revealed cards from their assigned operations
  OR (
    cards.revealed = true
    AND cards.operation_id IS NOT NULL
    AND exists (
      select 1 from operation_members om
      where om.operation_id = cards.operation_id
        and om.user_id = auth.uid()
    )
  )
  -- Backward compat: revealed cards with no operation_id visible to all group members
  OR (
    cards.revealed = true
    AND cards.operation_id IS NULL
    AND exists (
      select 1 from group_members gm
      where gm.group_id = cards.group_id
        and gm.user_id = auth.uid()
    )
  )
);

-- ─── Backfill ─────────────────────────────────────────────────────────────────
-- Assign all existing players to their group's current operation.

insert into operation_members (operation_id, user_id)
select g.current_operation_id, gm.user_id
from groups g
join group_members gm on gm.group_id = g.id
where gm.role = 'player'
  and g.current_operation_id is not null
on conflict do nothing;
