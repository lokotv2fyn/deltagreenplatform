# Naming: Group / Operation / Session — Problem & Diagnosis

**Status: implemented.** All decisions below were resolved and shipped in
`supabase/migrations/015_naming_mitigation.sql` plus the corresponding
frontend changes. The target design is now also documented in `CLAUDE.md`'s
Core Concepts. This doc is kept as the historical record of the diagnosis
and the reasoning behind each decision.

## What this doc is

Three related concepts — **group**, **operation**, and **session** — have
drifted apart from a single coherent naming/lifecycle model. Recent commits
(562bfde, e90826c, 18c34a2, 998dda3, e9cd9a0) all patched symptoms in this
area (tabs showing with no operation, auto-creating operations on group
creation, auto-bootstrapping an operation on `HandlerView` mount) without
ever writing down the intended design in one place.

Notably, `CLAUDE.md` at the repo root describes only "group" and "session"
("a session is only a pause flag") and never mentions "operation" at all —
that concept was added later (migration 011) and the doc was never updated
to match.

This doc has three parts:
1. **How the code currently defines each concept** — from reading the schema
   and RPCs only, no guessing. This part is done.
2. **How it's actually behaving** — symptoms as observed at the table. To be
   filled in.
3. **How it should work** — the target design. To be filled in.

---

## Relevant files

| File | Role |
|------|------|
| `supabase/migrations/001_initial_schema.sql` | `groups` and `sessions` tables, `start_new_session`/`stop_session` RPCs, `session_active()` RLS helper |
| `supabase/migrations/002_rpc_functions.sql` | `create_group` RPC |
| `supabase/migrations/011_operations.sql` | `operations` table, `current_operation_id` on `groups`, `archive_operation`/`rename_operation` RPCs, migration backfill naming |
| `supabase/migrations/012_operation_members.sql` | `operation_members` table, `create_operation`/`set_current_operation` RPCs, per-player assignment (now partially vestigial) |
| `supabase/migrations/014_simplify_cards_rls.sql` | Removed `operation_members` from the `cards_select` RLS check |
| `src/stores/groups.js` | `createGroup` (auto-creates first operation), `assignPlayer`/`removePlayer` |
| `src/stores/session.js` | `loadGroup`, `startSession`/`stopSession`, `loadActiveOperations`, `currentOperation` computed |
| `src/views/handler/HandlerView.vue` | Operation switcher, archive dialog naming, parallel-operation creation, mount-time bootstrap |
| `src/views/play/PlayView.vue` | Player-side board loading, follows `current_operation_id` |

---

## 1. How the code currently defines each concept

### Group

Table — `supabase/migrations/001_initial_schema.sql:29-38`:
```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  created_by uuid references profiles(id),
  invite_code text unique default substr(md5(random()::text), 1, 8),
  invite_expires_at timestamptz,
  current_session_id uuid, -- FK tilføjes nedenfor efter sessions er oprettet
  created_at timestamptz default now()
);
```

A second "current" pointer was bolted on later — `011_operations.sql:53`:
```sql
alter table groups add column current_operation_id uuid references operations(id);
```

So `groups` carries **two independent "current" pointers**:
`current_session_id` (pause/active state) and `current_operation_id` (which
board is in view). They're set by completely separate code paths and are
never reconciled against each other.

The `create_group` RPC (`002_rpc_functions.sql:34-55`) inserts the group with
the user-supplied `name`, creates the handler membership, and creates
`group_settings`. **It does not create a session or an operation.** Right
after `create_group`, a fresh group has both current-pointers `null` and zero
rows in `operations`/`sessions`.

### Operation

Table — `011_operations.sql:7-13`:
```sql
create table operations (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references groups(id) on delete cascade,
  name       text        not null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
```

`operations.name` has **no uniqueness constraint** at all. One operation is
"current" per group (`groups.current_operation_id`); the rest are either
active-but-not-current ("parallel") or archived (`archived_at is not null`).

`cards.operation_id` and `chain_links.operation_id` were added in the same
migration (`011_operations.sql:54-55`), both `on delete set null` — so an
operation is a **content-scoping container inside a group**. This directly
contradicts `CLAUDE.md:15-16`'s "one board per group — not per session"
framing: there can be many boards per group, one per non-archived operation.

RPCs (`012_operation_members.sql` and `011_operations.sql`):
- `create_operation(p_group_id, p_name)` — inserts a new operation and sets
  it as `groups.current_operation_id`, without archiving anything (multiple
  operations can be simultaneously non-archived — "parallel operations").
- `set_current_operation(p_group_id, p_operation_id)` — a pure UI-switch,
  just repoints `groups.current_operation_id`.
- `archive_operation(p_group_id, p_new_name)` (`011_operations.sql:78-116`) —
  archives the current operation and creates + switches to a new one.
- `rename_operation(p_operation_id, p_name)` (`011_operations.sql:119-144`).

### Session

Table — `001_initial_schema.sql:52-61`:
```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  label text,
  status text default 'active' check (status in ('active','paused','ended')),
  auto_reveal_override boolean, -- null = brug group_settings
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);
```

Sessions are FK'd only to `group_id` — **never to `operation_id`**. A session
is purely group-scoped, matching `CLAUDE.md`'s "session is only a pause
flag." No auto-naming exists: `label` defaults to `null` and is only ever set
from a free-text prompt (`HandlerView.vue` `promptStartSession`/
`doStartSession`). There is no "Session N" counter anywhere.

RPCs — `001_initial_schema.sql:404-429`:
```sql
create function stop_session(target_group uuid) returns void as $$
begin
  update sessions set status = 'paused'
  where id = (select current_session_id from groups where id = target_group);
end; $$ ...

create function start_new_session(target_group uuid, new_label text default null) returns uuid as $$
declare new_id uuid;
begin
  update sessions set status = 'ended', ended_at = now()
  where id = (select current_session_id from groups where id = target_group);
  insert into sessions (group_id, label, status)
  values (target_group, new_label, 'active')
  returning id into new_id;
  update groups set current_session_id = new_id where id = target_group;
  return new_id;
end; $$ ...
```

A session's lifecycle is entirely independent of operations: starting a new
session ends the old one and inserts a fresh row; it never touches
`operations` or `current_operation_id`.

`session_active(group_id)` (`001_initial_schema.sql:93-98`) gates write RLS
(card inserts by players, chain writes, position writes, private note
writes) purely on `groups.current_session_id → sessions.status = 'active'`.
So `session` really is just a write-gate/pause flag, not a data partition —
consistent with `CLAUDE.md`. **There is structurally no relationship between
a session and an operation** — they're two independent pointers on `groups`,
displayed side by side in the UI but never linked by any RPC or RLS policy.

---

## 2. How naming actually gets assigned today

Four different, uncoordinated schemes currently produce operation names:

**1. Migration 012 backfill** (`012_operation_members.sql:59-73`) — names
pre-existing groups' first operation literally `'Operation 1'`.

**2. `groups.js:createGroup`** (`src/stores/groups.js:21-31`, added in
998dda3) — names the auto-created operation **the same as the group name**:
```js
async function createGroup(name, description = '') {
  const { data, error } = await supabase
    .rpc('create_group', { group_name: name, group_description: description })
  if (error) throw error
  // Auto-create initial operation so the group is usable immediately
  const { error: opErr } = await supabase
    .rpc('create_operation', { p_group_id: data, p_name: name })
  if (opErr) throw opErr
  ...
}
```

**3. `HandlerView.vue` mount-time bootstrap** (added in e9cd9a0,
`src/views/handler/HandlerView.vue:867-872`) — same group-name fallback, as a
defensive catch for groups that fell through the cracks of the
migration-011/998dda3 window:
```js
onMounted(async () => {
  await session.loadGroup(groupId)
  await session.loadActiveOperations(groupId)

  // Bootstrap: if the group has no operation yet, create one with the group name.
  if (!session.currentOperation && session.allActiveOperations.length === 0 && session.group?.name) {
    await supabase.rpc('create_operation', { p_group_id: groupId, p_name: session.group.name })
    await session.loadGroup(groupId)
    await session.loadActiveOperations(groupId)
  }

  await board.loadBoard(groupId, session.currentOperation?.id)
  ...
})
```

**4. Archive dialog default name** (`HandlerView.vue:708-714`) — a naive
row-count guess:
```js
async function openArchiveDialog() {
  const { count } = await supabase
    .from('operations')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
  newOpName.value = `Operation ${(count ?? 0) + 1}`
  showArchiveDialog.value = true
}
```
This counts **all** operations for the group (archived + active, regardless
of naming pattern), so it's a straight `N+1` guess. Since it isn't filtered
by name pattern, it can drift out of sync with any "Operation N"-looking
sequence once a group-named or freely-typed operation exists in the count.
Parallel-operation creation (`doCreateOperation`, `HandlerView.vue:805-821`)
and the archive dialog both accept arbitrary free-text names with **no
uniqueness constraint** in the schema — duplicate operation names within a
group are fully possible today.

**Net effect:** a brand-new group's *first* operation is named after the
group itself (schemes 2/3), while every operation created afterward via the
UI defaults to "Operation N" (scheme 4), and pre-migration groups got a flat
"Operation 1" (scheme 1). There is no single naming convention across the
lifecycle of a group.

### Three defensive patches for one root cause

All three of these exist purely to work around "a group might have zero
operations," patched at three different layers instead of being guaranteed
once at the source (`create_group` itself):

1. `create_group` in `groups.js` (998dda3) — creates an operation
   immediately after the group RPC returns.
2. `HandlerView.vue onMounted` bootstrap (e9cd9a0) — catches groups that
   still have zero operations when the Handler opens the view.
3. `PlayView.vue`'s fallback when there's no current operation — falls back
   to `board.loadBoard(groupId, null)`, which (per `src/stores/board.js`)
   means "no operation filter → show all cards in the group" as a stopgap.

---

## 3. Two structural side-issues surfaced during this read (factual, not yet prescriptive)

These aren't strictly about *naming*, but they showed up while tracing the
operation model and are worth having on record:

- **`operation_members` no longer gates board visibility.** Migration 012
  built per-player operation assignment (`operation_members` table,
  `assign_player_to_operation`/`remove_player_from_operation`, and a
  `cards_select` RLS policy filtering revealed cards by membership). Migration
  014 (`014_simplify_cards_rls.sql`) rewrote `cards_select` to drop that
  check entirely — its own comment notes "operation_members table stays for
  future per-player isolation if needed." Yet `HandlerView.vue`'s player list
  and `groups.js`'s `assignPlayer`/`removePlayer` (touched as recently as
  e90826c and 18c34a2) still present a fully working assign/remove UI, as if
  it still controls who sees what. It doesn't anymore.

- **Players have no independent "which operation am I viewing" state.**
  `PlayView.vue` watches `session.currentOperation?.id` and follows it
  directly — when a Handler switches operations via `switchOperation`
  (`HandlerView.vue:824-829`), every player's board switches in lock-step,
  regardless of `operation_members` assignment. Combined with the point
  above, there's currently no mechanism preventing a player from seeing a
  "parallel" operation's revealed cards just because the Handler happened to
  be looking at it.

---

## How it's actually behaving

**Operation rename looks broken.** `rename_operation` exists and is wired up
in the Settings tab (`HandlerView.vue:347-360`), but using it doesn't appear
to do anything.

*Root cause found:* `saveOperationName` (`HandlerView.vue:717-725`) calls
`session.loadGroup(groupId)` after the RPC, but — unlike `doArchive`,
`doCreateOperation`, and `switchOperation`, which all reload both
`loadGroup` *and* `loadActiveOperations` — it never calls
`session.loadActiveOperations(groupId)`. The header's operation switcher
`<select>` (`HandlerView.vue:19-27`) is populated from
`session.allActiveOperations`, not from `session.currentOperation`. So the
rename RPC does write to the database correctly, but as soon as a group has
more than one active operation (the switcher-dropdown case), the switcher
keeps showing the pre-rename name until something else triggers a reload —
making it look like the button silently does nothing. This is a real,
isolated bug, not a symptom of the deeper naming-convention mess — it's a
missing one-line store refresh.

**Player assignment is "kinda useless"** (per `BUGS.md`'s Open list): a
player can only be assigned to the *current* operation, not to other
operations or across groups. Confirmed by reading `groups.js`'s
`assignPlayer`/`removePlayer` and `HandlerView.vue`'s `togglePlayerOp` — the
UI only ever operates against whichever operation ID is passed to it from
the currently-rendered operation row, and per-operation assignment no longer
gates board visibility at all since migration 014 (see side-issue above).
Resolved below: this whole mechanism is being replaced, not fixed.

---

## Mitigation plan (implemented)

Ordered so each step closes off a root cause rather than another symptom.
Shipped in `supabase/migrations/015_naming_mitigation.sql` and the
corresponding frontend changes.

**Step 1 — Guarantee an operation exists at creation, in exactly one place**
Operation creation moved *into* the `create_group` RPC itself (one
transaction), named after the group. This makes "a group always has ≥1
operation" a database-level guarantee instead of a hope. The two client-side
workarounds it makes redundant were deleted: the second RPC call in
`groups.js:createGroup` and the `HandlerView.vue onMounted` bootstrap.
`PlayView.vue`'s null-operation fallback was left in place as harmless
defensive code, now simply unreachable.

**Step 1b — Fix the rename-doesn't-appear-to-work bug (small, isolated, do
this regardless of the rest)**
Add `await session.loadActiveOperations(groupId)` to `saveOperationName`
(`HandlerView.vue:717-725`), matching what `doArchive`/`doCreateOperation`/
`switchOperation` already do. One line, no schema change, fixes exactly the
symptom reported above.

**Step 2 — Resolved: Option A.** First operation is always named after the
group (`create_group` does this atomically now). Every operation created
after that requires the Handler to type an explicit name — `openArchiveDialog`
no longer pre-fills a guessed name. A `unique (group_id, name)` constraint on
`operations` makes duplicate names impossible rather than just unlikely; a
one-time dedup pass in the migration renames any pre-existing duplicates
before the constraint is added.

**Step 3 — Resolved: replace `operation_members` with group-level membership**
Decided: per-player, per-operation isolation is not a feature Louise wants
("the invite logic should work just fine so I don't need to be able to
assign them anything"). So this is option (b) from the original fork, plus a
concrete replacement:
- *Remove:* `operation_members` table, `assign_player_to_operation`/
  `remove_player_from_operation` RPCs, `groups.js`'s `assignPlayer`/
  `removePlayer`/`fetchGroupPlayers`' membership-join logic, and
  `HandlerView.vue`'s per-operation player toggle UI (`togglePlayerOp`,
  `isPlayerInOp`, and the per-operation rows in the player list).
- *Add:* a "Group members" panel in Handler Settings — list everyone in
  `group_members` for the current group, with a single **Remove** action per
  player. Backed by a new `remove_group_member(p_group_id, p_user_id)` RPC
  (handler-only, deletes the `group_members` row), which revokes access to
  every operation in the group at once, since board access is gated by
  group membership, not operation membership (see side-issue above — that
  was already true since migration 014, this just makes the UI honest about
  it). No assignment step needed — `invite_player` already adds new members
  straight into the group.

**Step 4 — Resolved: stay orthogonal, document it.** No schema change.
Session and operation independence is now documented explicitly in
`CLAUDE.md`'s Core Concepts.

---

## Target logic (implemented)

- **Group creation is atomic with respect to operations.** Creating a group
  always leaves it with exactly one operation, named after the group, set as
  current. There is never a moment where a group has zero operations.
- **"Operation" = a story arc / mission container.** A group can have many
  operations over its life, but only one is *current* at a time — that's what
  the Handler and players see on the board. Every other operation is either
  *archived* (closed arc, read-only history, reachable via the Archives tab)
  or *parallel* (open, not currently in view, reachable via the operation
  switcher).
- **Operation naming is explicit and unique per group.** The first operation
  is named automatically per convention; every operation created after that
  requires the Handler to type a name, and the system refuses duplicates
  within the same group instead of silently allowing them. **Renaming any
  operation from Handler Settings must actually work** — including updating
  the operation switcher immediately, not just the plain-label view (Step 1b
  fixes the concrete bug behind this).
- **"Session" = a real-world sit-down at the table, orthogonal to operations.**
  Starting or stopping a session never touches which operation is current,
  and switching the current operation never touches session state. A
  session's only job is gating whether players can write to the board
  (add cards, move pieces, add private notes) — active vs. paused. It is not
  a container for cards and it does not partition data.
- **No per-operation player assignment. Membership is a group-level
  concept.** `operation_members` is removed entirely — it stopped gating
  visibility as of migration 014 and the UI for it was misleading. In its
  place, Handler Settings gets a **Group Members** panel: view everyone
  currently in the group, and remove any of them (revoking their access to
  the group and every operation in it in one action). Adding members stays
  exactly as it is today — via invite code/link, no manual assignment step.

All decisions above were confirmed by Louise and shipped together in
`supabase/migrations/015_naming_mitigation.sql`.
