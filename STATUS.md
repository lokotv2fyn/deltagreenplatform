# Platform — Status

Single place for what's broken, what's built, and what's next. Replaces
`BUGS.md`, `ROADMAP.md`, and `UI-IMPROVEMENTS.md` — their content is merged
in below. Deep-dive technical diagnoses for specific hard bugs stay as
separate files and are linked from here when relevant.

---

## Open bugs

1. **Invite link doesn't land the player in the right place.** After a
   player accepts an invite, it should redirect straight into the operation
   view of the board they were invited to, not just the dashboard.
2. **Session pause isn't visible to players in real time.** When the
   Handler pauses, the player should see it immediately — ideally a lock
   overlay similar to the reveal interrupt ("Board is locked during pause —
   you can still edit notes and your character"). When the session resumes,
   the session label in the player's header should update and the board
   should unlock without a page refresh.

## Resolved

- Handler route not protected against players guessing the URL — fixed via router guard
- Dashboard showed the group twice (once as handler, once as player) — fixed with `.eq('user_id')` filter in groups store
- Cards all stacked at (0,0) on the visual canvas — fixed in `resolvedPos()`
- Display name showed email prefix instead of a chosen name — fixed: profile tab lets players set their own display name
- Comms card label was "Tidspunkt (in-fiction)" — now just "Tidspunkt"
- Handler board/deck split now uses `revealed` instead of `card_positions.minimized` — matches Delta Green flow (revealed = on board, unrevealed = in deck)
- Naming for group/operation/session was confusing and inconsistent; per-operation player assignment was misleading (stopped gating visibility as of migration 014, only ever worked for the current operation) — fixed: `create_group` creates the first operation atomically (named after the group), operation names are unique per group, rename actually refreshes the switcher, and per-operation `operation_members` was replaced with a group-level Members panel (view + remove). See `NAMING_PROBLEM.md`.
- Character sheet data was leaking across players — `character_sheets`' `sheets_select` RLS policy was scoped to group membership instead of ownership (intentional for the Handler's Agents tab, but let any player read any other player's sheet directly), and `loadMySheet()` never filtered by `user_id` either, relying entirely on RLS. Fixed at both layers: migration `017_fix_character_sheets_select.sql` tightens the policy (own row only, unless Handler), `character.js`/`PlayView.vue` now filter explicitly too. See `PLAN.md`'s Phase 1 for the full writeup.
- **Reveal interrupt** — fixed by `6c3d086` ("detect reveals via board.cards
  watch with nextTick init"), confirmed working. See `REVEAL_PROBLEM.md` for
  the diagnosis history.
- **Red thread line positioning** — fixed by `03c124d` (ResizeObserver
  measuring actual card heights instead of a fixed offset), confirmed
  working. See `REDTHREAD_PROBLEM.md` for the diagnosis history.
- **Unrevealed cards in the dashboard are labeled "spoiler"** — should read
   "unrevealed".

---

## Built (v0.513)

### Auth and access
- Magic link login (Supabase Auth)
- Invite flow: handler generates link, player is automatically added to the group
- RLS: handler sees everything including spoilers; players see only revealed cards + their own
- Router guard: handler route protected against players
- Demo version for showcasing in open source and subreddits

### Board
- Cards: create, edit, delete — handler and player with separate permissions
- Reveal: handler can reveal/hide cards for players, with full-screen interrupt overlay for players
- Red thread: add/remove/reorder cards in the chain; visibility can be hidden by handler; drag-and-drop connections directly on the visual canvas; lines anchored to actual card centers (ResizeObserver)
- Realtime sync: all changes propagate live to all clients
- Visual canvas: drag-and-drop positioning, sidebar with card details

### Session & operations
- Start / stop / pause session
- Board is operation-scoped and survives a session stop unchanged
- Archive operation: move board to "Ended operations" and start fresh, or run parallel operations
- Group always has ≥1 operation from creation; naming and membership handled at the group level

### Player side
- Board tab: revealed cards + red thread
- Visual tab: same canvas as handler
- Private notes: linked to cards, only author + handler can see
- Character sheet: full Delta Green character — stats with a Handler-editable point-budget total (`group_settings.stat_point_cap`) and ×5 percentages; skills broken into Base / ★ Profession Baserate / Bonus / Earned with a computed Total (backward-compatible with pre-existing flat-number sheets — old values become Bonus, total unchanged); Bonds default to current CHA when added; one-time Breaking Point calculation (↻ button, not auto-tracking); Max SAN auto-clamps against the Unnatural skill (99 − Unnatural). Legibility pass (contrast, aligned columns, header row) after early density/contrast complaints.

### Handler interface
- Board tab with spoiler view
- Agents tab: read all players' character sheets
- Player notes tab: handler can read all private notes
- Activity log: who did what and when
- Settings: group name, description, invite link, auto-reveal toggle, operation rename/archive, group members

### UI
- Delta Green aesthetic: monospace, sharp edges, green palette, dark background
- Visual board: background image with dot-grid overlay, fixed to viewport
- Login: Jersey 10 font, background image
- Language switcher: Danish / English, persisted to localStorage; all source code in English
- Favicon; operation name shown next to session status in the header

---

## Backlog / what's next

### Visual board & red thread
- Hover tooltip on cards: expand content on hover as an alternative to the sidebar click
- Right-click and drag to pan around the board

### Player
- Character archival: retire / hospitalised / dead / custom — the reason is "stamped" onto the old character sheet, unfolds from an accordion in the archive tab (archive tab should hold both operations and characters)
- Improve the visual look of revealed cards

### Handler / platform
- Terminal card interactivity: players type commands into the terminal card type; handler defines valid commands and responses
- Mobile optimisation (read-only board, no drag)
- New tab: Locations - where large images can be shown of locations. They should each be their own new 'under-tab' to the original tab (locations) and the player realtime visibility of cursors should also be there, so players are able to point and communicate eg. 'do you mean these trees over here?' (p2)

### Open design question (needs a decision, not just a build)
- Player notes on archive: do they archive along with the operation, or does the player keep them across operations? Either way, probably organized per-operation in a foldable accordion.

### Bigger / later
- Landing page: in-character passphrase
- Notification of build updates when players login after a new build? (And the logic to this)

### Character tab
- The check that marks a failed attempt should be moved to the left of the skill name

---

## Playtester feedback

Feedback from real users, collected once actual playtesting began. Kept
separate from the Handler backlog above so origin stays traceable — these
are quotes (translated for the heading, original kept below each one), not
ideas Louise came up with herself. Tag an item `(p1)` and move it to
`PLAN.md` once it's needed before the next test; otherwise it stays here
until triaged.

### Keyboard shortcuts for card creation
Number-key shortcuts to open specific card-creation types directly (e.g. `1`
→ Ledetråd/Clue, `2` → Person/NPC, etc. — the player-facing card types), with
the cursor landing directly in the Title field so typing can start
immediately without a mouse click. Player's stated reasoning: too many mouse
clicks per card kills momentum during play, and shortcuts like this are a
small build for a surprisingly large perceived improvement.

Louise note: Would make most sence, that you use the keyboard to navigate the tabs. So each tab should be renamed to its corresponding keyboard navigation. 'Board [1]', Visuelt [2], etc. And then letters for navigating the card input as the feedback mentions. 

> **Original (da):** "tastatur genveje (fx 1 åbner kort-Ledetråd, 2 åbner
> kort-Person, osv.) og at markøren står i Titel feltet. Min erfaring er, at
> hvis man skal trykke for mange gange med musen, så går man død i det - så
> det er overraskende billig points, med tastatur genveje"

---

## Related docs

- `PLAN.md` — the active build queue: `(p1)` items pulled out of this doc's Backlog/Playtester feedback, grouped by shared work with a build order. Items move back here (Resolved/Built) once shipped.
- `NAMING_PROBLEM.md` — resolved; historical diagnosis of the group/operation/session naming mess and the decisions behind the fix.
- `REVEAL_PROBLEM.md`, `REDTHREAD_PROBLEM.md` — resolved; historical diagnosis logs for two hard bugs. Kept as reference for how each was actually root-caused, in case either regresses.
- `SECURITY.md` — security policy, unrelated to this tracker.
- `README.md` — project overview for new readers.
