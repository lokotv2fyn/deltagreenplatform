# Platform — Plan (active build queue)

Build order, chosen by Louise: **character sheet → handler board lock →
visual board polish → presence**. Presence is last on purpose — it's the
highest-risk phase technically (see Phase 4).

**Relationship to `STATUS.md`:** an item lives in exactly one file at a
time. `(p1)` items get cut from `STATUS.md` and pasted here; shipped items
get cut from here and a short entry added to `STATUS.md`'s Resolved/Built.
Never duplicated across both.

---

## Phase 1 — Character sheet improvements

**Sub-phases 1a + 1b shipped** — stats total + Handler-editable cap, Bond→CHA
default, the Base/★ Profession Baserate/Bonus/Earned skills breakdown, ×5
display, Breaking Point calculate button, Max SAN auto-clamp, plus a
legibility pass (contrast + column alignment in the skills grid) and the
character-sheet cross-user data leak fix found along the way. Migrations
`016` and `017` have been run; Louise tested and confirmed it live. Full
writeup moved to `STATUS.md`'s Built (Player side) and Resolved sections —
see there for the formulas, correction history, and decisions.

**Items 8, 10, 9 — all ✅ built, in that order per Louise's request. No new
migration for any of them** (`character_sheets.data` stays schemaless
JSONB). Not yet moved to `STATUS.md` — pending Louise testing this batch,
same as 1a/1b were held until confirmed live.

8. **✅ Built. Per-skill "used & failed this session" checkbox → 1d4 Earned
   roll.** Skill shape gained one more field: `{ bonus, earned,
   isProfessional, professionalBaserate, pendingCheck }`. Checkbox
   (`v-model="form.skills[key].pendingCheck"`) only renders while
   `session.isActive` (new `useSessionStore` import in `CharacterSheet.vue`
   — state was already loaded app-wide by `PlayView`, nothing new to wire
   up there). When a skill is checked, a second row appears beneath it
   (skill rows became `flex-col` wrappers to fit this without cramming the
   main row) with two independent resolve options: a 🎲 Roll 1d4 button
   (`rollEarned()`, `Math.floor(Math.random()*4)+1`) or a manual 1–4 input +
   Apply (`applyManualRoll()`) — either adds to `earned` and clears
   `pendingCheck`. Not click-testable via `/demo` (no active session there,
   by design), verified by code review + confirmed no regressions in the
   read-only render.

9. **✅ Built. Warn before leaving an unsaved character sheet.** Added real
   dirty-tracking that didn't exist before: `savedSnapshot` (a
   `JSON.stringify` of `form`, refreshed on load and on successful save)
   compared against the live form via a new `isDirty` computed
   (`!readonly && current !== snapshot`). Two guards: `beforeunload` listener
   in `CharacterSheet.vue` itself (browser tab close/refresh — message isn't
   customizable, that's the browser's own dialog); an emitted `update:dirty`
   event picked up by `PlayView.vue`, which now routes all tab clicks
   through a `switchTab(id)` function that shows a native `confirm()` before
   leaving the Character tab dirty (was a bare `@click="activeTab = tab.id"`
   with zero guard). This is a real bug fix, not just a nicety — `PlayView`
   uses `v-else-if` for its tabs, so switching away genuinely unmounts
   `CharacterSheet` and discards any unsaved in-memory edits; before this,
   there was no warning that would happen. New locale key
   `play.unsaved_confirm` (en + da). Not click-testable without a live
   login (needs a real dirty form + real tab switch); verified by code
   review and a clean regression check against `/demo`.

10. **✅ Built. Hover-highlight a skill row.** `.skill-row:hover { background:
    #1c1c1c; }` — first attempt (`#101010`) was too close to the page
    background to actually see; bumped once screenshotted and confirmed
    visible.

---

## Phase 1.2 — Character sheet skills polish (small, pre-Phase 2)

**✅ Built, all 4 items.** No new migration — `character_sheets.data` stays
schemaless JSONB (same pattern as items 8/9/10). Verified via `npm run
build` (clean) and a Playwright pass against `/demo` → Agents → an
expanded read-only sheet (screenshot-confirmed: both new skills present,
zero console errors besides a pre-existing unrelated 400 from the demo's
fake `groupId` hitting `group_settings`, not something this batch
touched). Item 2 (checkbox move) is code-reviewed only, same as items
8/9 in the batch above — `/demo` renders read-only with no active
session, so `session.isActive` is always false there and the checkbox
never renders regardless of position.

1. **Add the two missing skills; give "specify" skills more room.**
   Cross-checked `src/config/skillsList.js` (41 entries) against the
   official skill-set list on `assets/character-sheet.pdf` (42 named
   skills + a separate "Foreign Languages and Other Skills" block). Missing
   from code:
   - **Craft** (specify, base 0%) — e.g. "Craft: Carpentry"
   - **Science** (specify, base 0%) — e.g. "Science: Chemistry"

   Everything else already matches, including the existing specify skills
   (Art, Foreign Language, Military Science, Pilot).

   Root cause of the cramped specify fields: the specify `<input>` is
   squeezed inline right after the skill label (`w-14`, 56px —
   `CharacterSheet.vue:117-121`) inside an already-tight `grid-cols-2` row
   that also has to fit ★/Base/Bonus/Earn/Tot and, during a session, the
   checkbox. Fix: widen the sheet's content column (`max-w-2xl` → e.g.
   `max-w-4xl`) and widen the specify input itself so labels like "Foreign
   Language: ___" or "Military Science: ___" aren't truncated.

2. **Move the session checkbox to the left of the row.** `pendingCheck`
   checkbox currently renders at the far right of each skill row
   (`CharacterSheet.vue:146-149`). On the physical sheet the checkbox comes
   first, before the skill name (`☐ Accounting (10%)`). Move it to the
   start of the row — same `session.isActive` condition, header row (`✓`
   column, `CharacterSheet.vue:110`) moves to match.

3. **Discrete, non-punishing bonus-point counter.** Add a `Bonus: X/160`
   counter under the Skills heading, mirroring the existing `Total:
   {{statsTotal}} / {{statPointCap}}` pattern (`CharacterSheet.vue:55-58`) —
   but per Louise's spec it never turns red over cap, since Handlers
   sometimes hand out free bonus points outside the normal budget. New
   computed `bonusTotal` sums `form.skills[key].bonus` across all skills.
   Built with the cap hardcoded at 160 (`bonusPointCap` ref, no migration) —
   can be made Handler-editable later like `stat_point_cap` if wanted.

4. **Column flow: down-then-across, not row-wise.** `SKILLS` in
   `skillsList.js` is already in alphabetical order — the problem is purely
   the render. The skills grid is a plain `grid-cols-2` with one `v-for`
   (`CharacterSheet.vue:101-169`), and CSS grid's default auto-flow fills
   row-wise: col 1 gets item 1, col 2 gets item 2, col 1 gets item 3, etc.
   That interleaves the alphabet across both columns instead of reading
   down column 1 (A→ mid) then down column 2 (mid→Z), like a printed
   two-column list. Fix: split `SKILLS` into two halves (first half /
   second half by count) and render each half as its own column — either
   two separate `v-for` blocks side by side, or `grid-auto-flow: column`
   with an explicit row count. Needs to keep working after Craft/Science
   are added (item 1) and stay correct if skills are ever added/removed
   later, so split by computed length rather than a hardcoded index.

---

## Phase 1.3 — Skills grid visual tuning + total math bug (small, pre-Phase 2)

Noted by Louise, not yet built. Items 1–2 are visual-only (no migration
expected); item 3 is a correctness bug that needs live repro before a fix.

1. **Earn column is too visually loud.** The `earned` field/roll UI (🎲 Roll
   button, manual input + Apply, the `pendingCheck` checkbox row added in
   Phase 1 item 8) draws more visual weight than the rest of the skill row.
   Needs a quieter treatment — smaller/muted styling — without losing the
   Phase 1 item 8 functionality.
2. **Total skill value should be more visible.** The per-skill total
   (`Tot`) column is currently under-emphasized relative to the surrounding
   columns; make it stand out more (e.g. bolder or higher-contrast) so the
   final number a player rolls against is easy to spot at a glance.
3. **🐛 Wrong skill total on ★ Professional skills — not a single case, seen
   on multiple skills with different numbers (Base 50 + Bonus 20 → 520 was
   just the first example Louise spotted).** Isolated to Professional
   skills specifically (confirmed by Louise) — plain non-Professional
   skills are fine. No skill in `SKILLS`
   (`src/config/skillsList.js:2-46`) has a fixed `base` of 50 — highest
   printed base is 40 (Unarmed Combat) — so any "Base 50"-and-up display
   is coming from a ★-marked skill's manually-typed `professionalBaserate`
   input (`CharacterSheet.vue:138-140`). `skillTotal()`
   (`skillsList.js:52-56`) is `effectiveBase + entry.bonus + entry.earned`
   where `effectiveBase = entry.professionalBaserate` when `isProfessional`
   — plain numeric addition, so the formula alone doesn't explain the
   inflated totals; since it recurs across different skills/values rather
   than one fluke, suspect something systemic to the Professional path
   (`professionalBaserate` storage/load, `toggleProfessionalSkill`, or the
   `mergeSkillsData` branch at `skillsList.js:76-83`) rather than a one-off
   typo. **Next step: go through every ★ Professional skill on the actual
   sheet and log Base/Bonus/Earn/Tot as displayed vs. what's actually
   stored** (devtools/Vue inspector on `entry.professionalBaserate`,
   `entry.bonus`, `entry.earned`) to find the pattern, before touching code.

---

## Phase 2 — Handler board lock

New `group_settings.board_locked boolean default false` column + toggle,
separate from the existing session start/stop.

- **Important finding:** `006_realtime_publication.sql` only adds `cards`,
  `card_positions`, `chain_links`, `chain_state` to the Supabase Realtime
  publication — `groups`, `sessions`, and `group_settings` are **not** in
  it. This is very likely why Open bug #2 (session pause isn't visible to
  players in real time) doesn't work either, since `session.subscribeSession`
  listens for `groups`/`sessions` UPDATE events that Realtime never sends.
  Worth fixing both `board_locked` and bug #2 in the same migration — add
  all three tables to the publication.
- **UI, per Louise's spec:** two buttons in the Handler header. Existing
  "Stop session" stays exactly as-is. New button toggles `board_locked`
  only — no session-state change.
- **Player-side lock overlay:** reuse the fixed-overlay pattern already
  built twice in this codebase (`RevealInterrupt.vue`,
  `position:fixed;inset:0;z-index:9999`), gated on
  `group_settings.board_locked`. Player can still edit notes/character per
  the original request — the overlay should block board interaction only,
  not navigation to other tabs.

---

## Phase 3 — Visual board polish

Two items, very different sizes:

- **Fullscreen image viewer (small):** click a card's sidebar image
  (`VisualBoard.vue:137`) → simple full-viewport `<img>` overlay, same
  `position:fixed;inset:0` pattern as above. `VisualBoard.vue` already has
  an unrelated fullscreen mechanism for the whole canvas
  (`isFullscreen`/`fullscreenchange`, `VisualBoard.vue:306-313`) — this is a
  new, separate, per-image lightbox, not reusing that one directly, just
  the same visual pattern.
- **Red thread many-to-many (bigger — needs a design pass first):**
  `chain_links` (`001_initial_schema.sql:130-137`) is currently a flat
  ordered list (`position int`), not a graph. Going many-to-many needs an
  actual schema decision (e.g. an edges table like
  `chain_edges(from_card_id, to_card_id)`) before any code gets written.
  `REDTHREAD_PROBLEM.md` already documents this area as fragile and
  previously hard to debug — recommend a short dedicated planning round for
  this one specifically, rather than improvising mid-build.

---

## Phase 4 — Presence & player identity

Grouped together — and cross-referenced by Louise herself — because avatar
upload, canvas token, and live cursors share the same two pieces of new
infrastructure. It's the riskiest phase technically, which is also why it's
last:

- **Avatar + supplementary file upload** — let players upload a profile
  picture/avatar for their character, plus a supplementary file (e.g. an
  extended dossier or a PDF/HTML sheet with backstory).

  > **Original (da):** "Mulighed for at uploade et profilbillede/avatar
  > samt en supplerende fil (f.eks. et udvidet dossier eller PDF/HTML-ark
  > med baggrundshistorie)."
- **No Supabase Storage usage exists anywhere in this codebase today** —
  avatar/file upload is greenfield: new storage bucket + RLS policies from
  scratch, nothing to extend.
- **Live cursors need a new realtime mechanism** (Supabase Presence or
  Broadcast) — genuinely different from the `postgres_changes` sync used
  everywhere else. Worth noting: `REVEAL_PROBLEM.md`'s attempt log shows
  Broadcast channels were flaky and hard to get reliably working in this
  exact codebase before (channel-instance and timing issues, multiple
  failed attempts). Budget extra time for this one, or reconsider Presence
  API over Broadcast specifically because of that history.
- **Player token** reuses the avatar once upload exists — no separate work.

---

## How to prompt me for each phase

Paste the relevant one when you're ready to start that phase — each is
self-contained, references this file, and I'll re-ground against the actual
code before touching anything (things may have shifted since this plan was
written).

**Phase 1:**
> Let's build Phase 1 from `PLAN.md` — character sheet improvements. Start
> with the stats total counter and the Bond CHA default (both small), then
> the Base/Professional/Earned skills breakdown.

**Phase 1.2:**
> Let's build Phase 1.2 from `PLAN.md` — the character sheet skills polish.
> Add Craft and Science, widen the sheet for specify fields, move the
> session checkbox to the left, add the bonus-point counter (hardcoded 80
> cap unless I say otherwise), and fix the skills grid to flow
> down-then-across alphabetically instead of row-wise.

**Phase 1.3:**
> Let's build Phase 1.3 from `PLAN.md` — skills grid visual tuning. Tone
> down the Earn column so it's less visually loud, make the skill Tot
> (total) column more visible/prominent, and track down the skill total
> math bug (Base 50 + Bonus 20 showing 520 instead of 70) — I'll tell you
> which skill(s) it happens on.

**Phase 2:**
> Let's build Phase 2 from `PLAN.md` — the Handler board lock. Include
> adding `groups`/`sessions`/`group_settings` to the Realtime publication
> while we're in there, since that's likely also what's breaking Open bug
> #2.

**Phase 3:**
> Let's build Phase 3 from `PLAN.md` — visual board polish. Start with the
> fullscreen image viewer (small). For red thread many-to-many, let's do a
> planning round first — I want to see the schema options before we touch
> code.

**Phase 4:**
> Let's build Phase 4 from `PLAN.md` — presence and player identity. Start
> with the Storage bucket + avatar upload, then decide Presence vs.
> Broadcast for live cursors before building that part.
