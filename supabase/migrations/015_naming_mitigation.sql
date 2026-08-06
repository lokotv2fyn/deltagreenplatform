-- Migration 015: naming mitigation
-- See NAMING_PROBLEM.md for the full diagnosis this migration resolves.
--
-- 1. Dedup + enforce unique operation names per group.
-- 2. create_group now creates the first operation atomically (named after
--    the group) — no group can exist with zero operations anymore.
-- 3. join_group no longer touches operation_members (table is being dropped).
-- 4. Drop operation_members entirely — it stopped gating card visibility as
--    of migration 014 and its UI implied control that no longer existed.
-- 5. Add remove_group_member — replaces per-operation assignment with
--    group-level membership management.

-- ─── 1. Dedup existing operation names, then enforce uniqueness ──────────────

do $$
declare
  dup record;
  n   int;
begin
  for dup in
    select id, group_id, name,
           row_number() over (partition by group_id, name order by created_at) as rn
    from operations
  loop
    if dup.rn > 1 then
      update operations
      set name = dup.name || ' (' || dup.rn || ')'
      where id = dup.id;
    end if;
  end loop;
end $$;

alter table operations
  add constraint operations_group_name_unique unique (group_id, name);

-- ─── 2. create_group: also create the first operation, atomically ────────────

create or replace function create_group(group_name text, group_description text default '')
returns uuid as $$
declare
  new_id uuid;
  new_op_id uuid;
begin
  if not can_create_groups_self() then
    raise exception 'Du har ikke tilladelse til at oprette grupper';
  end if;

  insert into public.groups (name, description, created_by)
  values (group_name, group_description, auth.uid())
  returning id into new_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_id, auth.uid(), 'handler');

  insert into public.group_settings (group_id)
  values (new_id);

  insert into public.operations (group_id, name)
  values (new_id, group_name)
  returning id into new_op_id;

  update public.groups set current_operation_id = new_op_id where id = new_id;

  return new_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── 3. join_group: drop the operation_members assignment ────────────────────

create or replace function join_group(invite text) returns uuid as $$
declare
  target_id uuid;
begin
  select id into target_id
  from public.groups
  where invite_code = invite
    and (invite_expires_at is null or invite_expires_at > now());

  if target_id is null then
    raise exception 'Ugyldigt eller udløbet invite-link';
  end if;

  -- Idempotent: gør ingenting hvis brugeren allerede er medlem
  insert into public.group_members (group_id, user_id, role)
  values (target_id, auth.uid(), 'player')
  on conflict (group_id, user_id) do nothing;

  return target_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── 4. Drop operation_members entirely ───────────────────────────────────────

drop function if exists assign_player_to_operation(uuid, uuid);
drop function if exists remove_player_from_operation(uuid, uuid);
drop table if exists operation_members;

-- ─── 5. remove_group_member: group-level membership management ───────────────

create or replace function remove_group_member(p_group_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user_id = auth.uid() then
    raise exception 'cannot_remove_self';
  end if;

  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'handler'
  ) then
    raise exception 'not_handler';
  end if;

  delete from group_members
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;
