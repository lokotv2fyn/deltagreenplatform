# Known bugs

## Resolved
- Handler route not protected against players guessing the URL — fixed via router guard
- Dashboard showed the group twice (once as handler, once as player) — fixed with `.eq('user_id')` filter in groups store
- Cards all stacked at (0,0) on the visual canvas — fixed in `resolvedPos()`
- **Bug 6 — Display name:** Players shown with email prefix as display name instead of a chosen name — fixed: profile tab in PlayView lets players set their own display name
- **Bug 7 — Comms card label:** Field was labelled "Tidspunkt (in-fiction)" — fixed: label is now just "Tidspunkt"
- **Handler view: cards on board / in deck** — fixed: `onBoard`/`inDeck` now uses `revealed` instead of `card_positions.minimized`. Revealed = on board, unrevealed = in deck. Matches handler expectations and Delta Green game flow.

## Open

**Reveal interrupt**
Full-screen interrupt for players on handler reveal does not work — the card appears on the canvas but the interrupt overlay is never triggered. See `REVEAL_PROBLEM.md` for full diagnosis and next steps.


Console bugs:
Som spiller logget ind: index-B3XoZ1Bu.js:65  GET https://kqyuxjzwgtqtnenapqhm.supabase.co/rest/v1/group_settings?select=auto_reveal_player_cards&group_id=eq.5f3f00b7-4f0c-48e3-8b56-aa70d74d3768 406 (Not Acceptable)