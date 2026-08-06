-- Migration 014: simplify cards_select RLS
-- Players now follow groups.current_operation_id directly (no operation_members routing).
-- Card visibility is group-based: revealed cards visible to all group members.
-- operation_members table stays for future per-player isolation if needed.

drop policy if exists "cards_select" on cards;

create policy "cards_select" on cards for select using (
  -- Handlers see all cards in their group
  exists (
    select 1 from group_members gm
    where gm.group_id = cards.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'handler'
  )
  -- Players see their own cards regardless of reveal state
  OR cards.created_by = auth.uid()
  -- Players see revealed cards in any operation of their group
  OR (
    cards.revealed = true
    AND exists (
      select 1 from group_members gm
      where gm.group_id = cards.group_id
        and gm.user_id = auth.uid()
    )
  )
);
