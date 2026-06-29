-- Operation archive feature
-- Adds a named "operation" container per group.
-- One operation is current (archived_at IS NULL); the rest are archived.

-- ─── Table ───────────────────────────────────────────────────────────────────

create table operations (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references groups(id) on delete cascade,
  name       text        not null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table operations enable row level security;

create policy "Group members can view operations"
  on operations for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = operations.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "Handlers can insert operations"
  on operations for insert
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = operations.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'handler'
    )
  );

create policy "Handlers can update operations"
  on operations for update
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = operations.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'handler'
    )
  );

-- ─── Schema additions ─────────────────────────────────────────────────────────

alter table groups     add column current_operation_id uuid references operations(id);
alter table cards       add column operation_id uuid references operations(id) on delete set null;
alter table chain_links add column operation_id uuid references operations(id) on delete set null;

-- ─── Backfill ─────────────────────────────────────────────────────────────────

do $$
declare
  g      record;
  op_id  uuid;
begin
  for g in select id from groups loop
    insert into operations (group_id, name, created_at)
    values (g.id, 'Operation 1', now())
    returning id into op_id;

    update groups      set current_operation_id = op_id where id = g.id;
    update cards        set operation_id = op_id        where group_id = g.id;
    update chain_links  set operation_id = op_id        where group_id = g.id;
  end loop;
end $$;

-- ─── RPCs ────────────────────────────────────────────────────────────────────

-- archive_operation: archives current operation and starts a new one
create or replace function archive_operation(p_group_id uuid, p_new_name text)
returns json
language plpgsql
security definer
as $$
declare
  v_handler       boolean;
  v_current_op_id uuid;
  v_new_op_id     uuid;
begin
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'handler'
  ) into v_handler;
  if not v_handler then
    raise exception 'Not authorized';
  end if;

  select current_operation_id into v_current_op_id
  from groups where id = p_group_id;

  if v_current_op_id is not null then
    update operations set archived_at = now() where id = v_current_op_id;
  end if;

  insert into operations (group_id, name)
  values (p_group_id, p_new_name)
  returning id into v_new_op_id;

  update groups set current_operation_id = v_new_op_id where id = p_group_id;

  -- Reset chain visibility for new operation
  update chain_state set hidden = false where group_id = p_group_id;

  return json_build_object('id', v_new_op_id, 'name', p_new_name);
end;
$$;

-- rename_operation: renames any operation the handler owns
create or replace function rename_operation(p_operation_id uuid, p_name text)
returns json
language plpgsql
security definer
as $$
declare
  v_handler  boolean;
  v_group_id uuid;
begin
  select group_id into v_group_id from operations where id = p_operation_id;

  select exists (
    select 1 from group_members
    where group_id = v_group_id
      and user_id  = auth.uid()
      and role     = 'handler'
  ) into v_handler;
  if not v_handler then
    raise exception 'Not authorized';
  end if;

  update operations set name = p_name where id = p_operation_id;

  return json_build_object('id', p_operation_id, 'name', p_name);
end;
$$;
