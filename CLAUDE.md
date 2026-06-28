# DG Platform — udviklerinstruktioner

Denne mappe er et **nyt, separat projekt** — en online, multi-bruger platform
til at køre Delta Green-sessioner med flere spillere, live samarbejde og en
database. Det er IKKE en fortsættelse af det lokale `dashboard/`-værktøj
(som stadig findes uændret som en søstermappe, og som fortsætter som et
selvstændigt, offline lokalt værktøj).

**Start her:** `PLATFORM-ARCHITECTURE.md` i denne mappe er hoved-specifikationen
— datamodel, RLS-policies, app-struktur, migreringstrin og afklarede
beslutninger. Læs den, før du begynder at kode noget som helst.

## Hvad resten af filerne i denne mappe er

Mappen blev oprettet ved at kopiere `dashboard/` 1:1, for at give inspiration/
udgangspunkt — ikke fordi det er den arkitektur der skal bygges videre på.

- `display.html`, `control.html`, `content.js` — det **gamle, lokale**
  værktøj (statisk, ingen server, `BroadcastChannel` mellem to faner på samme
  maskine). God reference for visuel stil og korttype-logik, men den tekniske
  arkitektur (no-build, ingen database, ingen auth) gælder **ikke** for dette
  nye projekt.
- `engine/`, `control/` — et ufærdigt forsøg (17. juni) på at splitte det
  gamle værktøj op i komponenter. Aldrig koblet til `control.html`/
  `display.html` i produktion. Kan plukkes idéer eller kode fra (fx
  renderer-opdelingen pr. korttype), men er ikke i sig selv fundamentet for
  platformen.
- `terminals.js` — tidligere skitse til en interaktiv terminal-kommando-
  grænseflade (jf. `ROADMAP.md` punkt 1). Relevant inspiration, hvis/når
  platformen skal have et rigtigt terminal-feature.
- `ROADMAP.md` — generelle videreudviklingsidéer fra det gamle værktøj.
- `session test/` — indeholder filer der ikke er relateret til dette projekt
  (PDF'er om AI-transskribering m.m.). Ignorer denne mappe.

## Hvad der faktisk skal bygges her

Jf. `PLATFORM-ARCHITECTURE.md`:

- **Stack:** Supabase (Postgres + Auth + Realtime + Storage) + Vite + Vue 3
  + Tailwind (afklaret — ikke React/Next.js). `supabase-js` er framework-
  agnostisk. Pinia til state (presence, board-state), vue-router til
  ruterne i `PLATFORM-ARCHITECTURE.md` afsnit 4.
- **Kernemodel:** ét delt, kollaborativt board pr. GRUPPE (ikke pr. session
  — se "Session-livscyklus" i `PLATFORM-ARCHITECTURE.md` afsnit 4). Alle
  spillere ser samme kort, samme positioner, samme røde tråd, og hinandens
  live musemarkør (Realtime Presence). En "session" er en tidsmarkør/
  pause-flag (active/paused/ended), ikke en data-partition — boardet
  fortsætter uændret tværs af sessions.
- **Adgang styres af Postgres RLS,** ikke af klient-side logik. Private
  noter (kun forfatter + Handler ser dem) er kernekravet der gør RLS
  ufravigeligt her — tjek altid policies med et par forskellige testbrugere,
  ikke kun som Handler.
- **Multi-tenant fra start** (`group_id` på alt), selvom der i praksis kun
  køres én gruppe ad gangen lige nu — skemaet er allerede designet til flere.

## Arbejdsgang

Dette er et rigtigt udviklingsprojekt: git, npm/pnpm, miljøvariabler
(Supabase URL + anon key, aldrig service-role-nøglen i frontend-kode), og en
deploy-pipeline (Netlify). Behandl det som et normalt webprojekt — ikke som
det no-build-filosofiske valg i `dashboard/`.

**`.env` er strengt off-limits:** `.env` skal stå i `.gitignore` fra den
første commit. Læs aldrig, vis aldrig, og committ aldrig indholdet af en
`.env`-fil i dette projekt — heller ikke for at "tjekke om en variabel er
sat". Miljøvariabler sættes i Netlifys eget UI, ikke i repoet.

Når du laver ændringer i datamodellen, opdatér `PLATFORM-ARCHITECTURE.md`
parallelt, så den forbliver den autoritative kilde til skema og
beslutninger — ikke kun en historisk note.
