-- Migration 017: fix character_sheets read scoping
--
-- BUG: sheets_select (004_character_sheets.sql) scoped SELECT to group
-- membership only, not ownership — intentional so the Handler's Agents tab
-- can read every player's sheet, but it also let any group member read any
-- OTHER member's sheet directly. Combined with character.js's loadMySheet()
-- never filtering by user_id (it relied entirely on RLS to hand back "the"
-- row), a Handler who also isn't the sheet's owner could end up with a
-- different player's sheet data. Players can now only ever read their own
-- row; only the Handler role can read every sheet in the group.

drop policy if exists "sheets_select" on character_sheets;

create policy "sheets_select" on character_sheets for select using (
  user_id = auth.uid()
  or exists (
    select 1 from group_members
    where group_members.group_id = character_sheets.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'handler'
  )
);
