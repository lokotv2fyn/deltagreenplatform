# DG Platform — udviklerinstruktioner

Online, multi-bruger platform til at køre Delta Green-sessioner med live
samarbejde og delt board. Stack: **Supabase + Vite + Vue 3 + Tailwind + Pinia
+ vue-router**. Deploy: Netlify.

**Start her:** `PLATFORM-ARCHITECTURE.md` er hoved-specifikationen —
datamodel, RLS-policies, app-struktur og afklarede beslutninger. Læs den
inden du koder noget.

---

## Kernekoncepter

- **Ét board pr. gruppe** — ikke pr. session. En "session" er kun et
  pause-flag; boardet overlever session-stop uændret.
- **RLS håndhæver adgang** — ikke klient-side logik. Handler ser alt inkl.
  spoilers, spillere ser kun revealed kort + egne. Private noter (kun
  forfatter + handler) er kernekravet der gør RLS ufravigeligt.
- **Multi-tenant fra start** — `group_id` på alt, selvom der typisk kun
  køres én gruppe ad gangen.

---

## `.env` er strengt off-limits

`.env` er i `.gitignore` og skal forblive der. Læs, vis eller committ aldrig
indholdet — heller ikke for at "tjekke om en variabel er sat". Miljøvariabler
sættes i Netlifys UI. Service-role-nøglen kommer aldrig i frontend-kode.

---

## Arbejdsgang

- Brug `npm run dev` lokalt. Kræver `.env` med `VITE_SUPABASE_URL` og
  `VITE_SUPABASE_ANON_KEY`.
- Databaseændringer: skriv migration i `supabase/migrations/`, kør manuelt
  mod Supabase-projektet, opdatér `PLATFORM-ARCHITECTURE.md` parallelt.
- Åbne bugs: se `BUGS.md`. Reveal interrupt er parket — se `REVEAL_PROBLEM.md`.

---

## Sprogkonvention

- Kildekode (variabelnavne, funktioner, kommentarer) skrives på **engelsk**.
- UI-tekster er pt. på dansk. Der kommer en language switcher (dansk/engelsk)
  — se ROADMAP.md.
