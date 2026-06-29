# DG Platform — architecture (multi-group, online, Supabase)

**Status: built and deployed (v0.513).** This document is the authoritative source
for the schema, RLS policies, and app structure — update it in parallel with
any code changes.

The old local tool (`display.html` / `control.html` / `engine/`) has been deleted
from this repo. The platform is now the only active project in the folder.

---

## 1. Why this stack

| Need | Solution |
|---|---|
| Multiple groups, multiple sessions | Supabase Postgres, multi-tenant via `group_id` on everything |
| Players log in | Supabase Auth (magic link — no password management) |
| Real-time between devices | Supabase Realtime (Postgres changefeed over websocket) |
| Access control (private notes, handler sees everything) | Postgres Row Level Security (RLS) |
| Frontend | Vite + Vue 3 + Tailwind — `supabase-js` is framework-agnostic, so Realtime/Auth/Storage work identically with Vue. Pinia for state (presence, board-state), vue-router for the routes in section 4. |

This is a real development stack (git, npm, environment variables, deploy). That is
why this project belongs in Claude Code / a real editor — not in a file-by-file
chat session.

---

## 2. Data model (Postgres / Supabase)

```sql
-- User profile, linked to Supabase Auth's auth.users
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  is_superadmin boolean default false,     -- only you (Louise) in practice right now
  can_create_groups boolean default false, -- controls who can create a group (= become its handler)
  created_at timestamptz default now()
);

-- A campaign group
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',      -- shown on the player's "choose group" landing page
  created_by uuid references profiles(id),
  invite_code text unique default substr(md5(random()::text), 1, 8),
  invite_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Membership + role. role controls ALL access.
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('handler', 'player')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- A game session / sitting within a group. IMPORTANT: this is NO LONGER a
-- data partition (see "Session lifecycle" under section 4) — it is a log
-- unit + a pause/active flag. The board itself (cards, positions, chain,
-- notes) is group-scoped and continues unchanged across sessions.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  label text,
  status text default 'active' check (status in ('active','paused','ended')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- Points to the group's "current" sitting (active or paused — null if none
-- has started yet, or if the most recent one was set to 'ended').
-- Used by RLS to determine whether players can write to the board right now.
alter table groups add column current_session_id uuid references sessions(id);

-- Named operation containers (migration 011). One is current (archived_at IS NULL);
-- the rest are archived and viewable by handler + players in the Archives tab.
create table operations (
  id          uuid        primary key default gen_random_uuid(),
  group_id    uuid        not null references groups(id) on delete cascade,
  name        text        not null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Pointer to the currently active operation
alter table groups add column current_operation_id uuid references operations(id);

-- cards and chain_links get an operation_id FK (set null when operation deleted)
alter table cards       add column operation_id uuid references operations(id) on delete set null;
alter table chain_links add column operation_id uuid references operations(id) on delete set null;

-- RPCs: archive_operation(p_group_id, p_new_name) and rename_operation(p_operation_id, p_name)

-- Helper function: is the group's current sitting 'active' (not paused / none)?
create function session_active(g uuid) returns boolean as $$
  select exists (
    select 1 from groups gr join sessions s on s.id = gr.current_session_id
    where gr.id = g and s.status = 'active'
  );
$$ language sql security definer;

-- Cards: both handler-authored (briefing/npc/evidence/...) and player-created clues.
-- The card itself (and its content) lives in the group forever — it does not
-- disappear when a session 'ended'. session_id is only a historical marker for
-- "which sitting was this created in", used in the activity log, NOT a
-- visibility filter.
create table cards (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,  -- historical, not a visibility filter
  type text not null,                 -- briefing | handout | npc | bevis | unnatural | terminal | comms | clue ...
  label text not null,
  data jsonb not null default '{}',   -- same shape as in the current content.js
  origin text not null default 'handler' check (origin in ('handler','player')),
  created_by uuid references profiles(id),
  revealed boolean default false,     -- false = spoiler, handler-only
  pinned boolean default false,       -- true = placed on the case board
  created_at timestamptz default now()
);

-- Red thread / chain membership. GROUP-scoped, not session-scoped — the chain
-- survives a 'stop session' and is still there next sitting. Shared and
-- collaborative: ALL players can add/remove threads between clues, not just
-- the handler (but only when the session is 'active', see RLS below).
create table chain_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  card_id uuid references cards(id) on delete cascade,
  position int not null,               -- chain number
  added_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Chain visibility (show/hide), GROUP-scoped (same rationale as above)
create table chain_state (
  group_id uuid primary key references groups(id) on delete cascade,
  hidden boolean default false
);

-- SHARED board layout per card. GROUP-scoped via the card (no own session_id) —
-- the position a card is at survives a 'stop session'. This is NOT personal
-- per player — it is one shared, collaborative board that everyone sees
-- update in real time (like a multiplayer whiteboard). Separated from
-- `cards` because access differs: any group member can move / minimise a
-- card, but only the author / handler can edit the card's content (label/data).
create table card_positions (
  card_id uuid primary key references cards(id) on delete cascade,
  x real default 0,
  y real default 0,
  z_index int default 0,
  minimized boolean default true,   -- true = in the deck at the bottom, not placed on the board
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- Handler settings per group, with optional per-session override
create table group_settings (
  group_id uuid primary key references groups(id) on delete cascade,
  auto_reveal_player_cards boolean default true,
  settings jsonb default '{}'   -- future toggles without a new migration
);
alter table sessions add column auto_reveal_override boolean; -- null = use group_settings

-- Preparation assets: PDFs, images, .md/text files the handler uploads to a
-- group (optionally scoped to a specific session), which can be attached to
-- cards. The actual file lives in Supabase Storage, not in this table — this
-- table is metadata + a reference to the storage path.
create table group_assets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null, -- null = belongs to the group generally, not a specific session
  uploaded_by uuid references profiles(id),
  storage_path text not null,      -- path in the Storage bucket, e.g. 'group_id/uuid-filename.pdf'
  file_name text not null,         -- original file name, for display
  mime_type text not null,
  kind text not null check (kind in ('pdf', 'image', 'markdown', 'text')),
  created_at timestamptz default now()
);
-- Max file size per upload: 20 MB, checked in the UI before the upload starts
-- (only the handler uploads for now, so this is a pragmatic limit, not a
-- security measure — can be raised if it becomes an issue).

-- Links an asset to a card (many-to-many: the same asset can in principle
-- be used on multiple cards, e.g. a map shared across several evidence cards
-- that all point to the same document)
create table card_assets (
  card_id uuid references cards(id) on delete cascade,
  asset_id uuid references group_assets(id) on delete cascade,
  primary key (card_id, asset_id)
);

-- Activity log — handler-only audit trail. Filled by triggers (see below),
-- not by application code, so it cannot be skipped or tampered with from
-- the client.
create table activity_log (
  id bigint generated always as identity primary key,
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,           -- 'card_created' | 'card_revealed' | 'position_moved' |
                                   -- 'card_minimized' | 'chain_added' | 'chain_removed' |
                                   -- 'note_created' | 'note_updated'
  target_table text not null,
  target_id uuid,
  details jsonb default '{}',     -- e.g. { from: {x,y}, to: {x,y} } for a move
  created_at timestamptz default now()
);

-- Example trigger: logs every change to card_positions automatically.
-- group_id/session_id are looked up via the card (card_positions no longer
-- has these columns directly, per group-scoping above); session_id in the
-- log is the group's CURRENT sitting at the time of the change (a historical
-- marker, not a visibility filter — see "Session lifecycle" below).
-- The same pattern can be reused on chain_links, cards (reveal), private_notes
-- (without logging the note text itself — only that a note was updated).
create function log_position_change() returns trigger as $$
declare
  g uuid;
begin
  select c.group_id into g from cards c where c.id = new.card_id;
  insert into activity_log (group_id, session_id, actor_id, action, target_table, target_id, details)
  values (
    g,
    (select current_session_id from groups where id = g),
    auth.uid(),
    case when new.minimized and not old.minimized then 'card_minimized'
         when not new.minimized and old.minimized then 'card_restored'
         else 'position_moved' end,
    'card_positions',
    new.card_id,
    jsonb_build_object('from', jsonb_build_object('x', old.x, 'y', old.y),
                        'to', jsonb_build_object('x', new.x, 'y', new.y))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_log_position_change
  after update on card_positions
  for each row execute function log_position_change();

-- Private notes — only the author and handler can see them. GROUP-scoped,
-- not session-scoped: a player's notes are ONE running notebook per group,
-- not a new blank page each sitting. They can always be READ (even when the
-- session is paused — players can check notes between sessions), but can
-- only be EDITED by players when the session is 'active' (see RLS — this
-- is the "freeze" part of the stop-session requirement).
create table private_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  card_id uuid references cards(id) on delete set null,  -- optional: note linked to a specific card
  body text not null default '',
  updated_at timestamptz default now()
);

-- Event-bus for reveal interrupts: handler inserts a row when a card is
-- revealed; players listen for INSERT events via postgres_changes. Separated
-- from the cards UPDATE event itself because RLS blocks UPDATE events for
-- rows the player could not previously see (revealed=false → true).
-- Migration: 007_reveal_notifications.sql
-- Status: table and RLS created; real-time delivery to players is being
-- debugged (see REVEAL_PROBLEM.md)
create table reveal_notifications (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  created_at timestamptz default now()
);
```

**Presence and live cursors** (requirement: players must be able to see each
other's presence and mouse cursor) are **not** stored in Postgres. They are
too short-lived / high-frequency for a database — use Supabase Realtime
**Presence** instead (an ephemeral broadcast layer on top of the websocket
connection): each client sends `{ user_id, display_name, color, cursor_x, cursor_y }`
several times per second on a `presence` channel scoped to `session_id`. This
is separate from the `postgres_changes` channel used for cards / chain / notes.

---

## 3. Row Level Security — access principles

General rule: **everything is scoped to `group_id`**, and a user must appear
in `group_members` for that group to see anything in it.

```sql
-- Helper function: is the user a handler in this group?
create function is_handler(g uuid) returns boolean as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid() and role = 'handler'
  );
$$ language sql security definer;

-- cards: players only see revealed OR their own card. Handler sees everything (including spoilers).
-- Note: revealed is now set automatically on insert for player cards, per group_settings.
create policy "cards_select" on cards for select using (
  is_handler(group_id)
  or created_by = auth.uid()
  or (revealed = true and exists (
    select 1 from group_members where group_id = cards.group_id and user_id = auth.uid()
  ))
);

-- Players can only create cards while the session is 'active' (paused = no
-- new inputs). Handler is not limited by this — can prepare at any time.
create policy "cards_insert_player" on cards for insert with check (
  origin = 'player' and created_by = auth.uid()
  and session_active(group_id)
  and exists (select 1 from group_members where group_id = cards.group_id and user_id = auth.uid())
);

create policy "cards_insert_handler" on cards for insert with check (
  is_handler(group_id)
);

-- card_positions: SHARED board — all group members can SEE positions at all
-- times (even when paused — the board still needs to display, just not be
-- changed). Writing requires either the handler role, or an 'active' session.
create policy "positions_select" on card_positions for select using (
  exists (
    select 1 from cards c join group_members gm on gm.group_id = c.group_id
    where c.id = card_positions.card_id and gm.user_id = auth.uid()
  )
);
create policy "positions_write" on card_positions for all using (
  exists (
    select 1 from cards c join group_members gm on gm.group_id = c.group_id
    where c.id = card_positions.card_id and gm.user_id = auth.uid()
    and (is_handler(c.group_id) or session_active(c.group_id))
  )
);

-- private_notes: ONLY author + handler can SEE (core requirement). Reading
-- is ALWAYS allowed, even when paused (players can check notes between sessions).
-- Editing requires the session to be 'active', unless you are the handler.
create policy "notes_select" on private_notes for select using (
  author_id = auth.uid() or is_handler(group_id)
);
create policy "notes_write" on private_notes for insert with check (
  author_id = auth.uid() and (is_handler(group_id) or session_active(group_id))
);
create policy "notes_update" on private_notes for update using (
  author_id = auth.uid() and (is_handler(group_id) or session_active(group_id))
);

-- chain_links: all group members can SEE the chain at all times. Add/remove
-- requires handler or an 'active' session — same "freeze on pause" principle.
create policy "chain_select" on chain_links for select using (
  exists (select 1 from group_members where group_id = chain_links.group_id and user_id = auth.uid())
);
create policy "chain_write" on chain_links for all using (
  exists (select 1 from group_members where group_id = chain_links.group_id and user_id = auth.uid())
  and (is_handler(chain_links.group_id) or session_active(chain_links.group_id))
);

-- group_settings: handler-only read/write
create policy "settings_handler_only" on group_settings for all using (
  is_handler(group_id)
);

-- groups: only visible to members (the dashboard shows "my groups", not a
-- public list of all groups on the platform)
create policy "groups_select_member" on groups for select using (
  exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
);

-- groups: only users with can_create_groups = true can create a group
-- (= become its handler). In practice only you right now.
create policy "groups_insert_authorized" on groups for insert with check (
  created_by = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and can_create_groups = true)
);

-- profiles: a superadmin (you) can grant/revoke can_create_groups for others.
-- Regular users can only view/edit their own display_name.
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and can_create_groups = (select can_create_groups from profiles where id = auth.uid()));
  -- ^ prevents a user from writing can_create_groups=true onto themselves
create policy "profiles_superadmin_manage" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_superadmin = true)
);

-- group_assets: all group members can view/download; only handler can upload/delete
create policy "assets_select" on group_assets for select using (
  exists (select 1 from group_members where group_id = group_assets.group_id and user_id = auth.uid())
);
create policy "assets_write_handler_only" on group_assets for all using (
  is_handler(group_id)
);

-- card_assets: follows the same visibility as the card it is linked to (revealed/own/handler)
create policy "card_assets_select" on card_assets for select using (
  exists (select 1 from cards c where c.id = card_assets.card_id) -- cards_select policy already filters
);
create policy "card_assets_write_handler_only" on card_assets for all using (
  exists (select 1 from cards c where c.id = card_assets.card_id and is_handler(c.group_id))
);
```

**Supabase Storage:** create a bucket (e.g. `group-assets`), **private** (not
public), with storage policies that mirror the `group_assets` rules above:
upload only if `is_handler(group_id)` (derived from the file-path prefix
`group_id/...`), download/read only if the user is a member of the group.
Actual files live in Storage; `group_assets.storage_path` is the reference.
Fetching a file happens via a short-lived signed URL (`createSignedUrl`),
not a permanent public URL — even PDFs/images must go through access control,
not be freely accessible via a guessed link.

---

## 4. App structure (Vite + Vue 3 + Tailwind + supabase-js)

```
/app
├── /login                       ← Supabase magic-link auth (only entry point for all roles)
├── /dashboard                   ← Landing page after login: list of MY groups/sessions
│   │                              (name + handler's description), click → /handler/[groupId]
│   │                              or /play/[groupId] depending on role in that group
│   └── /new                     ← "create group", only visible/accessible if can_create_groups = true
├── /handler/[groupId]          ← secret handler interface
│   ├── board (same shared board, but also sees revealed=false cards, marked as spoiler)
│   ├── settings (auto_reveal_player_cards and future toggles, per group/session;
│   │             invite link regeneration, group description)
│   ├── assets (upload PDF/image/.md/text, attach to cards, see "Preparation assets")
│   ├── activity (activity log — see section 7.1)
│   └── notes (can read ALL players' private notes)
├── /play/[groupId]             ← player view — SAME shared board as everyone else sees
│   ├── board (collaborative board: all reveals, live cursors, drag/minimize/red thread)
│   └── notes (own private notes only, CRUD)
└── /join/[inviteCode]          ← landing page for invite link → login → group_members insert
```

**The role model is superadmin → handler → player, not flat.** `is_superadmin`
(only you in practice) can give other users `can_create_groups = true`, after
which they can create their own groups and automatically become handler for
exactly those groups (still just a regular player in groups others create).
There is currently no UI for this — it is set manually in the database, because
only you use it. An `/admin` page to toggle `can_create_groups` for other users
is an obvious future extension, but not needed in v1.

**Preparation assets** (PDF, image, .md/text file) are uploaded by the handler
to a group (optionally scoped to a specific session) via `/handler/[groupId]/
assets`. When the handler creates or edits a card, one or more already-uploaded
assets can be selected and linked to the card (`card_assets`). Players
view/download attached assets on cards they have access to (same visibility
rule as the card itself), but do not upload themselves — only player-created
*cards* (clue cards, i.e. `cards.origin = 'player'`) are something players
create; file upload is a handler-only preparation tool.

### Login / invite flow, expanded

1. **Handler creates a group** (from `/handler` after their own login) → inserts
   a row into `groups`; `invite_code` is generated automatically by the column default.
2. **Handler shares the invite link** (`/join/<invite_code>`) with their players
   out-of-band — SMS, Discord, whatever they use.
3. **Player opens `/join/<invite_code>`.** The page looks up the code in `groups`
   (without requiring login first — it is a public-but-secret-by-obscurity link).
   If the code does not exist or has expired → error page with a message to ask
   the handler for a new link.
4. **Player logs in via Supabase magic-link** (`/login`, but with `invite_code`
   saved in URL/state so the flow can continue after login). supabase-js handles
   the session/token in the browser — no custom code needed for that.
5. **After confirmed login:** insert a row into `group_members` with
   `role = 'player'` and `group_id` from the code, **if** the user is not
   already a member (idempotent — otherwise a person clicking the link again
   would fail).
6. **Redirect to `/play/[groupId]`.**

**Invite code expiry / regeneration** (your point in 7.3 — the code should not
live forever for security reasons):

`invite_expires_at` is already in the `groups` table in section 2.

- Typically set to e.g. 7 days from creation, or the handler can set it
  manually (single-use for one specific player, for example).
- `/join/[inviteCode]` checks `invite_expires_at > now()` in the same query
  as the code lookup — an expired code is treated as "does not exist".
- The handler UI should have a **"Generate new invite link"** button: updates
  `invite_code` (new random string) + `invite_expires_at` (new date). This
  automatically invalidates the old link, which is the only "revoke" mechanism
  needed — there is no separate invite-status field.
- Existing members (`group_members`) are not affected by the code expiring —
  expiry only prevents *new* sign-ups; it does not remove existing players.

### Session lifecycle: "stop session" / "start new session"

This is the core of 8.2: the handler must be able to stop an evening's play
temporarily and continue exactly where they left off next time.

**Why the board was made group-scoped instead of session-scoped**
(see the changes in section 2): if `card_positions` / `chain_links` /
`private_notes` had been tied to the individual session, a new session would
by definition start with an empty board — the opposite of "continue where you
left off". The solution is to let the board itself (cards, positions, chain,
notes) live at the group level permanently, and let `sessions` be a pure
timestamp / log unit with a status flag, not a data partition.

**Flow:**

1. **Stop session:** Handler clicks "Stop session" in the menu. The client
   sets `sessions.status = 'paused'` on the group's `current_session_id`.
   Nothing else is written or cleared — cards, positions, chain, and notes
   stay exactly where they were.
2. **Realtime broadcast of pause:** When `sessions` is updated, all players'
   `postgres_changes` subscription picks up the change immediately. The
   player's UI reacts by showing a "Session paused by handler" screen over
   the board (the board is still visible **read-only** in the background —
   not a blank page) and disables drag/create/chain buttons. RLS blocks the
   writes anyway (see below), so the UI lock is for good UX, not the actual
   security.
3. **While paused:** players can still read the board and their own private
   notes (`notes_select` has no pause condition), but cannot write to
   `cards` / `card_positions` / `chain_links` / `private_notes` — this is
   the "freeze" part of the requirement, handled by the `session_active()`
   check in the RLS policies in section 3. The handler is exempt from this
   restriction and can still prepare/edit.
4. **No forced logout** (settled above) — players do not need to log out;
   the pause screen + RLS is enough. They can choose to log out themselves
   if they want.
5. **Start new session:** Handler clicks "Start new session" (from the same
   group menu). This creates a new row in `sessions` with `status='active'`,
   sets the previous session's `status='ended'`, and points the group's
   `current_session_id` to the new one. The board is already there — nothing
   to rebuild.

```sql
-- Example: the two actions as RPC functions (called from the client via
-- supabase.rpc(), run with the user's own permissions — only the handler
-- can actually complete them due to the RLS check inside the function)
create function stop_session(target_group uuid) returns void as $$
begin
  if not is_handler(target_group) then raise exception 'handler only'; end if;
  update sessions set status = 'paused'
  where id = (select current_session_id from groups where id = target_group);
end;
$$ language plpgsql security invoker;

create function start_new_session(target_group uuid, new_label text) returns uuid as $$
declare
  new_id uuid;
begin
  if not is_handler(target_group) then raise exception 'handler only'; end if;
  update sessions set status = 'ended', ended_at = now()
  where id = (select current_session_id from groups where id = target_group);
  insert into sessions (group_id, label, status) values (target_group, new_label, 'active')
  returning id into new_id;
  update groups set current_session_id = new_id where id = target_group;
  return new_id;
end;
$$ language plpgsql security invoker;
```

**The board is one shared, collaborative room** — not a personal dashboard per
player. Everyone in the session sees the same cards, the same positions, the
same red thread, and each other's mouse cursors in real time (like a
multiplayer whiteboard). The only personal / private layer is the notes.

Players can on this shared board:
- minimise a card, so it goes into a deck at the bottom (`card_positions.minimized = true`)
- choose to pull it back up / place it freely (`minimized = false`, set `x`/`y`)
- move freely-placed cards around (updates `x`/`y` live for everyone)
- add/remove a card from the red thread, and choose its chain number

Realtime: two layers.
1. `postgres_changes` on `cards`, `card_positions`, `chain_links`, `chain_state`
   — the persistent, shared board content.
2. Realtime **Presence** (not in the database) for cursors and "who is online"
   — see section 2 above.

This replaces `BroadcastChannel` 1:1 in concept — same event model, just over
the internet, with multiple simultaneous editors, and access control built into
the database instead of "everyone on the machine sees everything".

The UI rendering layer (card-type skins, chain animation) from the current
`display.html` / `control.html` can largely be **reused as logic**, just moved
from vanilla-JS DOM manipulation to Vue components (one component per card type,
same split as the current `engine/renderers/*.js` files in `platform/`), and
with drag-state now driven by `card_positions` instead of a local `pinned` list.
The `hashInt` / `hashRange` pattern for deterministic visual variation
(rotation, stack offset) can be copied directly as ordinary JS helper functions
— it is not React/Vue-specific.

---

## 5. Migration status

| Step | Status |
|------|--------|
| 1. Supabase project + schema + RLS | ✅ Migrations 001–007 run |
| 2. Auth + invite flow + dashboard | ✅ Built |
| 3. Shared board view, realtime | ✅ Migration 006 fixes realtime publication |
| 4. Handler interface: create/reveal/settings | ✅ Built |
| 5. Player side: cards + notes | ✅ Built |
| 6. Drag/minimize, live sync | ✅ Built |
| 7. Red thread, realtime sync | ✅ Built |
| 8. Presence / live cursors | ⬜ Not built yet |
| 9. Session lifecycle | ✅ Built |
| 10. Reveal interrupt for players | 🔴 Built but not working — see REVEAL_PROBLEM.md |
| 11. Delta Green UI aesthetic | ✅ Built (v0.513) |

## 6. Settled decisions

- **Presence/cursors:** Yes — players see each other's online status and
  mouse cursor live on the shared board (Presence, see section 2).
- **Auto-reveal of player cards:** Yes, as the default (`group_settings.auto_reveal_player_cards = true`).
  Must be controllable by the handler — both per group (default) and overrideable
  per session (`sessions.auto_reveal_override`), so it can be adjusted on the
  fly without a code change.
- **Scale:** Only one simultaneous group in practice right now. The schema is
  still multi-tenant (cost nothing extra to design correctly), but there is no
  reason to worry about Supabase free-tier limits or scaling until it actually
  becomes relevant.
- **Relationship to the old tool:** New, separate project. `dashboard/` (the
  current local tool) is left untouched — it continues as-is. The folder was
  copied into `platform/` as a reference/inspiration for Claude Code (including
  the unfinished `engine/` / `control/` split and `terminals.js` from June 17th,
  preserved unchanged at explicit request — they are not part of the new
  Supabase architecture, but ideas/code can be borrowed from them).
- **Dashboard flow:** Login first (magic-link), then `/dashboard` with a list
  of the groups/sessions the user is already a member of (name + handler's
  description). The group list is never public/visible to unauthenticated users
  — only new players coming via an invite link enter without already being a member.
- **Handler role:** You are superadmin. Right now only you can create groups
  (`can_create_groups`), but the model is built so you can later give other
  users the same right if they want to run their own Delta Green group on the
  platform. No UI for this in v1 — set manually in the database until it
  becomes relevant.
- **Asset upload:** Only the handler uploads preparation material (PDF, image,
  .md/text) to a group and attaches it to cards. Players create their own
  *cards* (clues), but do not upload files — this is deliberately a
  handler-only preparation function, not shared file storage. Max 20 MB per
  upload (pragmatic limit, not security — only you upload in practice).
- **Frontend stack:** Vue 3 + Vite + Tailwind (not React) — `supabase-js` is
  framework-agnostic, and you are experienced with Vue, which outweighs any
  technical difference between the two.
- **Session pause/resume:** See the new "Session lifecycle" section under
  section 4 — the board was made group-scoped (not session-scoped) precisely
  to support "continue where you left off". Pause is a soft UI screen + RLS
  blocking, not a real forced logout.
- **Terminal feature (ROADMAP item 1):** Deferred — not part of v1 of the
  platform. Will be revisited as a standalone extension later.
- **Deploy:** Netlify. Remember `.gitignore` for `.env`, and a rule in
  `platform/CLAUDE.md` / Claude Code instructions to never read or commit
  `.env` files.
- **Testing:** You have another person ready to help with RLS / flow testing
  with real multiple users, not just yourself as handler.

## 7. Settled: activity log, "last write wins", and invite flow

**7.1 — Handler sees everything, including history.** Confirmed requirement:
the handler must not only be able to see the *current* state (already covered
by the old policies via shared SELECT on `card_positions` / `chain_links`),
but a **historical log** of who did what. Solved with the new `activity_log`
table (section 2): filled by Postgres triggers (not client calls, so it
cannot be skipped), locked to handler-only via the RLS policy below, and
intended to be displayed as a collapsible "Activity log" section in the
handler menu — a simple list ("Andreas moved *Police Report* 14:32", "Anne
added red thread between *Witness Statement* and *Call Log* 14:35"), not a
separate page.

```sql
create policy "activity_handler_only" on activity_log for select using (
  is_handler(group_id)
);
```

The trigger pattern from section 2 (`log_position_change`) should be repeated
for `chain_links` (insert/delete) and `private_notes` (only that a note was
updated — **not** the text itself, which would undermine the whole point of
private notes) and optionally `cards` (reveal events).

**7.2 — What does "last write wins" actually mean?** It does *not* mean "first
to grab the card wins" — it means **the most recent database write that
actually reaches Postgres wins, regardless of who started first**. Concrete
example: Andreas starts dragging a card at 14:32:00.000 and drops it at
14:32:01.500 at position (300, 400). Anne starts dragging the *same* card at
14:32:00.800 (while Andreas is still dragging) and drops it at 14:32:01.200
at position (150, 250). Even though Andreas started first, Anne's UPDATE
arrives at the database *before* Andreas's (01.200 vs. 01.500) — so Anne's
position is overwritten by Andreas's 0.3 seconds later. The result is not
predictable for players at the moment it happens; the only guarantee is that
the last UPDATE to commit is the one that remains. There is no merging or
error message — just overwriting.

At tabletop-RPG tempo (cards are typically moved one at a time, not in intense
competition) it is fine to keep it simple like this. If it becomes a problem
in practice (two players frequently hit the same card), the easy mitigation is
to use Presence (same layer as cursors) to broadcast "user X is currently
holding card Y" — so the UI can show a small indicator / lock icon on the card,
**without** a real server-side lock. This does not prevent the conflict but
makes it visible before it happens. Not built in v1, but noted here as the
natural next mitigation if it becomes relevant.

**7.3 — Login / invite flow.** See the expanded "Login / invite flow, expanded"
section under section 4 above — including the `invite_expires_at` column and
the regeneration mechanism.

---

## 8. Before Claude Code — overlooked / unresolved items

Most items below are now settled (see §6). What remains as genuinely open or
as a concrete note for setup:

- **`cards.data jsonb` is still free-form.** The schema deliberately says
  nothing about what is in `data` for each card type (briefing/npc/evidence/
  unnatural/terminal/comms/clue) — this is a deliberate 1:1 inheritance from
  `content.js`'s loose structure. Before the Vue components for each card type
  are built, write a concrete TypeScript interface (or just a commented sketch)
  for `data`'s shape per type, otherwise the "new card type = 4 places to
  update, otherwise it silently breaks" problem from the old tool (see
  `dashboard/CLAUDE.md`) repeats — just now spread across Vue component + RLS
  + Postgres constraint instead of 4 JS files. **This is the only point that
  should genuinely be settled before starting in Claude Code** — the rest can
  be decided as you go.
- **Reconnection / "ghost cursors".** Realtime Presence normally cleans up
  by itself when a client closes the connection gracefully, but on a network
  drop / sleeping laptop a cursor can "hang" visible to others for a few
  seconds before timeout. Worth knowing before you wonder during testing — this
  is expected Presence behaviour, not a bug. (Confirmed — no change needed.)
- **Mobile / responsive.** Players will likely log in from a phone occasionally
  (e.g. to read private notes between sessions, per §6). The shared board with
  drag/cursors is primarily designed for desktop use — still unresolved whether
  mobile should get a simplified view (read-only board, no drag) or attempt full
  parity. Can be decided when you reach it in the code.
- **Environment variables / deploy:** Netlify (settled, §6). Concrete setup:
  `.env` in `.gitignore` from day one, `SUPABASE_URL` / `SUPABASE_ANON_KEY`
  set as Netlify environment variables (not in the repo), and a line in
  `platform/CLAUDE.md` saying Claude Code should never read or commit `.env`
  files.
- **Testing:** You have another person ready for RLS / flow testing (settled,
  §6). Still test concretely as: log in as handler in one browser, as player
  in another (or incognito), and confirm that private notes, spoiler cards, and
  the pause state actually work as expected for both roles — not just that the
  code compiles.

---

## 9. Card type schema (`cards.data`)

The last open point from §8 — now settled. The shape per card type is a 1:1
translation of the fields `content.js` already uses (see `dashboard/content.js`
and the comment at the top of the file), formalised as TypeScript interfaces.
**Enforced only in the TypeScript/Vue layer, not as Postgres CHECK constraints**
— the `data` column stays free `jsonb`. This is a deliberate choice: the schema
is still in flux, and an incorrect shape gives at worst "the card looks wrong",
not data corruption anyone else is affected by. If it ever becomes relevant
(multiple independent content authors, higher risk), CHECK constraints can be
added later without changing this base shape.

```ts
// types/cards.ts — one interface per cards.type

interface BriefingData {
  heading: string;
  stamp: string;
  body: string;          // may contain ||redacted text||
}

interface HandoutData {
  caseNumber: string;
  body: string;
  imageUrl?: string;     // FALLBACK: external link. Primary path for images
                          // is to attach a group_asset via card_assets —
                          // see note below.
}

interface NpcData {
  name: string;
  role: string;
  affiliations: string[];
  notes: string;
  imageUrl?: string;      // fallback, see above (replaces the old photoUrl)
}

interface BevisData {
  exhibitNumber: string;
  foundAt: string;
  description: string;
  analysis?: string;      // may contain ||redacted text||
  imageUrl?: string;      // fallback, see above
}

interface UnnaturalData {
  title: string;
  sanCost?: string;        // free text, e.g. "1/1d6 SAN" — not a structured number
  body: string;            // may contain ||redacted text||
}

interface TerminalData {
  // v1: display only. interactive/commands[] added as a schema extension
  // when terminal interactivity (ROADMAP item 1) is actually built — deferred.
  lines: string[];
  showCursor?: boolean;
}

interface CommsData {
  sender: string;
  message: string;
  time?: string;           // free text, in-fiction time — not a timestamp
}

type CardType = 'briefing' | 'handout' | 'npc' | 'bevis' | 'unnatural' | 'terminal' | 'comms';
```

**Images: primarily via the asset system.** `imageUrl` / `photoUrl` from the
old tool is replaced by `card_assets` (section 2) as the primary path — an
image is uploaded once as a `group_asset` and can be attached to one or more
cards, fetched via a short-lived signed URL (same access control as all other
assets). The optional `imageUrl` field in `data` is a **fallback** for a
quick external link when a proper upload is overkill — and it saves Storage
space for one-off links. The Vue component for a card type should therefore
check `card_assets` (kind='image') first, and only fall back to `data.imageUrl`
if no asset is attached.

**Player-created cards use the same types and fields as handler cards.**
`origin = 'player'` controls only *permissions* (RLS — who may insert/edit,
and when the session allows it), not a different data structure. There is no
RLS restriction on which `type` a player chooses — a player can in principle
create an `npc` or `unnatural` card with the same fields the handler would use.
If you want to limit which types are actually meaningful for players to choose
in the UI (e.g. only `bevis` / `comms`, not `briefing`, which thematically is
the handler's mission briefing), that is a **UI decision** in the type selector
on "create card" — not a database rule, and can be changed freely without a
migration.

**The redaction syntax (`||text||`) is not part of the schema itself** — it is
a text convention inside the free-text fields (`body`, `notes`, `description`,
`analysis`, `message`), parsed in the Vue component at render time, exactly as
`renderRedacted()` does in the current `display.html`.
