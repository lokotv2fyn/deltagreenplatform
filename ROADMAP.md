# Platform — roadmap

## Built (v0.513)

### Auth and access
- Magic link login (Supabase Auth)
- Invite flow: handler generates link, player is automatically added to the group
- RLS: handler sees everything including spoilers; players see only revealed cards + their own
- Router guard: handler route protected against players

### Board
- Cards: create, edit, delete — handler and player with separate permissions
- Reveal: handler can reveal/hide cards for players
- **Reveal interrupt: full-screen overlay for players when handler reveals a card** ✓
- Red thread: add/remove/reorder cards in the chain; visibility can be hidden by handler
- **Red thread: drag-and-drop connections directly on the visual canvas** ✓
- **Red thread: lines anchored to actual card centers (ResizeObserver)** ✓
- Realtime sync: all changes propagate live to all clients (migration 006 + 007)
- Visual canvas: drag-and-drop positioning, sidebar with card details

### Session
- Start / stop / pause session
- Board is group-scoped and survives a session stop
- **Archive operation: move board to "Ended operations" and start fresh** ✓

### Player side
- Board tab: revealed cards + red thread
- Visual tab: same canvas as handler
- Private notes: linked to cards, only author + handler can see
- Character sheet: full Delta Green character with stats, skills, bonds

### Handler interface
- Board tab with spoiler view
- Agents tab: read all players' character sheets
- Player notes tab: handler can read all private notes
- Activity log: who did what and when
- Settings: group name, description, invite link, auto-reveal toggle

### UI
- Delta Green aesthetic: monospace, sharp edges, green palette, dark background
- Visual board: background image with dot-grid overlay, fixed to viewport
- Login: Jersey 10 font, background image
- Language switcher: Danish / English, persisted to localStorage; all source code in English

---

## Future

- Presence: live mouse cursors on the visual canvas
- Player tokens on the canvas
- Red thread: many-to-many connections (currently linear chain)
- Interactive terminal card type
- Character archival: retire / hospitalised / dead — archived sheet stamped with reason, accordion in archives tab
- Favicon: green icon in browser title bar
- Landing page: in-character passphrase
- Mobile optimisation (read-only board, no drag)
- Demo version for showcasing in open source and subreddits
