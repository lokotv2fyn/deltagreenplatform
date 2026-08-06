# DG Platform — developer instructions

Online, multi-user platform for running Delta Green sessions with live
collaboration and a shared board. Stack: **Supabase + Vite + Vue 3 + Tailwind
+ Pinia + vue-router**. Deploy: Netlify.

**Start here:** `PLATFORM-ARCHITECTURE.md` is the main specification —
data model, RLS policies, app structure, and settled decisions. Read it
before writing any code.

---

## Core concepts

- **A group has one or more operations; boards are scoped per operation, not
  per group or per session.** `groups.current_operation_id` points at
  whichever operation is currently in view. A group is guaranteed to have at
  least one operation from the moment it's created (`create_group` creates it
  atomically) — there is never a "no operation yet" state to handle. Every
  operation after the first is created explicitly by the Handler (archive +
  start new, or create a parallel one) and must have a name that's unique
  within the group. **Naming convention:** the first operation is always
  named after the group; every later one requires the Handler to type a name.
- **"Session" is only a pause flag, and is fully orthogonal to operations.**
  It never scopes or partitions data — the board survives a session stop
  unchanged, and switching the current operation never touches session
  state or vice versa. A session's only job is gating whether players can
  write to the board (add cards, move pieces, add private notes): active vs.
  paused.
- **Group membership is the only access control — no per-operation
  assignment.** Everyone in a group's `group_members` can see whichever
  operation is currently active for that group; there is no mechanism to
  show different operations to different players within the same group.
  Handler Settings has a Group Members panel to view/remove members; adding
  members is invite-only (no manual assignment step). See
  `NAMING_PROBLEM.md` for the full history of why this replaced the earlier
  per-operation `operation_members` model.
- **RLS enforces access** — not client-side logic. Handler sees everything
  including spoilers; players see only revealed cards + their own. Private
  notes (author + handler only) are the core requirement that makes RLS
  non-negotiable here.
- **Multi-tenant from day one** — `group_id` on everything, even though
  typically only one group runs at a time.

---

## `.env` is strictly off-limits

`.env` is in `.gitignore` and must stay there. Never read, show, or commit
its contents — not even to "check whether a variable is set". Environment
variables are set in Netlify's UI. The service-role key never goes into
frontend code.

---

## Workflow

- Use `npm run dev` locally. Requires `.env` with `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`.
- Database changes: write a migration in `supabase/migrations/`, run it
  manually against the Supabase project, and update `PLATFORM-ARCHITECTURE.md`
  in parallel.
- Open bugs: see `BUGS.md`. Reveal interrupt is parked — see `REVEAL_PROBLEM.md`.

---

## Language convention

- Source code (variable names, functions, comments) is written in **English**.
- UI text supports **Danish and English** via vue-i18n. Locale strings live in
  `src/locales/da.json` and `src/locales/en.json`. The language toggle
  persists to localStorage under the key `dg-locale`.
