-- Spillere kan redigere og slette egne kort (origin = 'player', created_by = auth.uid())
create policy "cards_update_player" on cards
  for update
  using (origin = 'player' and created_by = auth.uid() and is_group_member(group_id));

create policy "cards_delete_player" on cards
  for delete
  using (origin = 'player' and created_by = auth.uid() and is_group_member(group_id));
