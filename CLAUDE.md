# DG Platform — developer instructions

Online, multi-user platform for running Delta Green sessions with live
collaboration and a shared board. Stack: **Supabase + Vite + Vue 3 + Tailwind
+ Pinia + vue-router**. Deploy: Netlify.

**Start here:** `PLATFORM-ARCHITECTURE.md` is the main specification —
data model, RLS policies, app structure, and settled decisions. Read it
before writing any code.

---

## Core concepts

- **One board per group** — not per session. A "session" is only a pause
  flag; the board survives a session stop unchanged.
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
