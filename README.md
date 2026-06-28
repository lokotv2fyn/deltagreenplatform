# Delta Green — Handler's Platform

A real-time collaborative board for running [Delta Green](https://www.delta-green.com/) tabletop RPG sessions online. Built for a Handler and their agents.

## What it does

- **Shared board** — Handler creates cards (clues, NPCs, locations, communications, terminals). Players see only what the Handler reveals.
- **Red thread** — a linear chain of key cards that tracks the investigation's spine, visible to all.
- **Visual canvas** — drag cards freely on a atmospheric background with dot-grid overlay.
- **Private notes** — players attach notes to cards; only the author and Handler can read them.
- **Character sheets** — full Delta Green character sheets with stats, skills, and bonds.
- **Real-time sync** — all changes propagate live via Supabase Realtime.
- **Session control** — Handler starts, pauses, and stops sessions; the board persists across sessions.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3 + Vite + Tailwind + Pinia + vue-router |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Auth | Magic link (email OTP) |
| Deploy | Netlify |

## Access model

Access is enforced by Postgres Row Level Security — not client-side logic.

| Role | Sees |
|------|------|
| Handler | All cards (revealed + unrevealed), all player notes, all character sheets |
| Agent | Revealed cards only, own notes, own character sheet |

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Environment variables are set in Netlify's UI for production — never committed to the repo.

## Architecture

See `PLATFORM-ARCHITECTURE.md` for the full data model, RLS policies, and routing.

## Status

v0.513 — core board, auth, character sheets, and Delta Green UI aesthetic are complete. See `ROADMAP.md` for what's next.
