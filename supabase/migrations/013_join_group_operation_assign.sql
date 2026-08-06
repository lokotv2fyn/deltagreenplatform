-- Migration 013
-- 1. Update join_group to auto-assign player to the group's current operation.
-- 2. Add SELECT policy on group_settings for all group members (was handler-only,
--    causing 406 errors when PlayView reads auto_reveal_player_cards).

-- ─── Fix join_group ───────────────────────────────────────────────────────────

create or replace function join_group(invite text) returns uuid as $$
declare
  target_id    uuid;
  target_op_id uuid;
begin
  select id, current_operation_id into target_id, target_op_id
  from public.groups
  where invite_code = invite
    and (invite_expires_at is null or invite_expires_at > now());

  if target_id is null then
    raise exception 'Ugyldigt eller udløbet invite-link';
  end if;

  -- Idempotent: do nothing if already a member
  insert into public.group_members (group_id, user_id, role)
  values (target_id, auth.uid(), 'player')
  on conflict (group_id, user_id) do nothing;

  -- Auto-assign to the group's current active operation
  if target_op_id is not null then
    insert into public.operation_members (operation_id, user_id)
    values (target_op_id, auth.uid())
    on conflict do nothing;
  end if;

  return target_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── group_settings: allow all group members to SELECT ───────────────────────

create policy "group_settings_select_members"
  on group_settings for select using (
    exists (
      select 1 from group_members
      where group_id = group_settings.group_id
        and user_id = auth.uid()
    )
  );
