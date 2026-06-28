# DG Platform — arkitektur (multi-gruppe, online, Supabase)

**Status: bygget og deployeret (v0.513).** Dette dokument er den autoritative kilde
til skema, RLS-policies og app-struktur — opdatér det parallelt med kodeændringer.

Det gamle lokale værktøj (`display.html`/`control.html`/`engine/`) er slettet fra
dette repo. Platformen er nu det eneste aktive projekt i mappen.

---

## 1. Hvorfor denne stack

| Behov | Løsning |
|---|---|
| Flere grupper, flere sessions | Supabase Postgres, multi-tenant via `group_id` på alt |
| Spillere logger ind | Supabase Auth (magic link — ingen password-administration) |
| Realtid mellem enheder | Supabase Realtime (Postgres-changefeed over websocket) |
| Adgangsstyring (private noter, Handler ser alt) | Postgres Row Level Security (RLS) |
| Frontend | Vite + Vue 3 + Tailwind — `supabase-js` er framework-agnostisk, så Realtime/Auth/Storage virker identisk med Vue. Pinia til state (presence, board-state), vue-router til ruterne i afsnit 4. |

Det er en reel udviklings-stack (git, npm, miljøvariabler, deploy). Det er derfor
dette projekt hører hjemme i Claude Code/en rigtig editor — ikke i en fil-for-fil
chat-session.

---

## 2. Datamodel (Postgres / Supabase)

```sql
-- Brugerprofil, kobler sig til Supabase Auth's auth.users
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  is_superadmin boolean default false,     -- kun dig (Louise) i praksis lige nu
  can_create_groups boolean default false, -- styrer hvem der kan oprette en gruppe (= blive Handler for den)
  created_at timestamptz default now()
);

-- En kampagne-gruppe
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',      -- vises på spillerens "vælg gruppe"-forside
  created_by uuid references profiles(id),
  invite_code text unique default substr(md5(random()::text), 1, 8),
  invite_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Medlemskab + rolle. role styrer ALT adgang.
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('handler', 'player')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- En spilleaften/sitting inden for en gruppe. VIGTIGT: dette er IKKE en
-- data-partition længere (se forklaring under "Session-livscyklus" nedenfor)
-- — det er en log-enhed + et pause/aktiv-flag. Selve boardet (kort, positioner,
-- kæde, noter) er gruppe-scoped og fortsætter uændret tværs af sessions.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  label text,
  status text default 'active' check (status in ('active','paused','ended')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- Peger på gruppens "nuværende" sitting (active eller paused — null hvis
-- ingen er startet endnu, eller hvis den seneste blev sat til 'ended').
-- Bruges af RLS til at afgøre om spillere kan skrive til boardet lige nu.
alter table groups add column current_session_id uuid references sessions(id);

-- Hjælpefunktion: er gruppens nuværende sitting 'active' (ikke paused/ingen)?
create function session_active(g uuid) returns boolean as $$
  select exists (
    select 1 from groups gr join sessions s on s.id = gr.current_session_id
    where gr.id = g and s.status = 'active'
  );
$$ language sql security definer;

-- Kort: både Handler-forfattede (briefing/npc/bevis/...) og spiller-oprettede clues.
-- Kortet selv (og dets indhold) lever i gruppen for evigt — det forsvinder ikke
-- når en session 'ended'. session_id er kun en historisk markør for "hvilken
-- sitting blev dette oprettet i", brugt i aktivitetsloggen, IKKE en synligheds-filter.
create table cards (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,  -- historisk, ikke et synligheds-filter
  type text not null,                 -- briefing | handout | npc | bevis | unnatural | terminal | comms | clue ...
  label text not null,
  data jsonb not null default '{}',   -- samme form som i nuværende content.js
  origin text not null default 'handler' check (origin in ('handler','player')),
  created_by uuid references profiles(id),
  revealed boolean default false,     -- false = spoiler, kun Handler ser den
  pinned boolean default false,       -- true = ligger på case board
  created_at timestamptz default now()
);

-- Rød tråd / kæde-medlemskab. GRUPPE-scoped, ikke session-scoped — kæden
-- overlever en 'stop session' og er der stadig næste sitting. Delt og
-- kollaborativ: ALLE spillere kan tilføje/fjerne tråde mellem clues, ikke
-- kun Handler (men kun når sessionen er 'active', se RLS nedenfor).
create table chain_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  card_id uuid references cards(id) on delete cascade,
  position int not null,               -- kæde-nr
  added_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Kæde-synlighed (gem/skjul), GRUPPE-scoped (samme begrundelse som ovenfor)
create table chain_state (
  group_id uuid primary key references groups(id) on delete cascade,
  hidden boolean default false
);

-- DELT board-layout pr. kort. GRUPPE-scoped via kortet (ikke et eget session_id) —
-- positionen et kort ligger på overlever en 'stop session'. Dette er IKKE
-- personligt pr. spiller — det er ét fælles, kollaborativt bord alle ser
-- opdatere sig i realtid (a la et multiplayer whiteboard). Adskilt fra
-- `cards`, fordi adgangen er anderledes: enhver gruppemedlem kan flytte/
-- minimere et kort, men kun forfatter/Handler kan redigere selve kortets
-- indhold (label/data).
create table card_positions (
  card_id uuid primary key references cards(id) on delete cascade,
  x real default 0,
  y real default 0,
  z_index int default 0,
  minimized boolean default true,   -- true = ligger i bunken i bunden, ikke placeret på boardet
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- Handler-indstillinger pr. gruppe, med mulighed for override pr. session
create table group_settings (
  group_id uuid primary key references groups(id) on delete cascade,
  auto_reveal_player_cards boolean default true,
  settings jsonb default '{}'   -- fremtidige toggles uden ny migration
);
alter table sessions add column auto_reveal_override boolean; -- null = brug group_settings

-- Forberedelses-assets: pdf'er, billeder, .md/tekst-filer Handleren uploader
-- til en gruppe (evt. scoped til en bestemt session), som kan vedhæftes kort.
-- Selve filen ligger i Supabase Storage, ikke i denne tabel — denne tabel er
-- metadata + reference til storage-path.
create table group_assets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null, -- null = tilhører gruppen generelt, ikke en bestemt session
  uploaded_by uuid references profiles(id),
  storage_path text not null,      -- path i Storage-bucket, fx 'group_id/uuid-filnavn.pdf'
  file_name text not null,         -- oprindeligt filnavn, til visning
  mime_type text not null,
  kind text not null check (kind in ('pdf', 'image', 'markdown', 'text')),
  created_at timestamptz default now()
);
-- Max filstørrelse pr. upload: 20 MB, tjekket i UI'et før upload starter
-- (kun Handler uploader lige nu, så det er en pragmatisk grænse, ikke en
-- sikkerheds-foranstaltning — kan sættes op hvis det bliver et problem).

-- Kobler et asset til et kort (mange-til-mange: samme asset kan i princippet
-- bruges på flere kort, fx et kort over flere bevis-kort der peger på samme dokument)
create table card_assets (
  card_id uuid references cards(id) on delete cascade,
  asset_id uuid references group_assets(id) on delete cascade,
  primary key (card_id, asset_id)
);

-- Aktivitetslog — Handler-only audit trail. Fyldes af triggers (se nedenfor),
-- ikke af applikationskoden, så den ikke kan springes over eller manipuleres
-- fra klienten.
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
  details jsonb default '{}',     -- fx { from: {x,y}, to: {x,y} } for et flyt
  created_at timestamptz default now()
);

-- Eksempel-trigger: logger enhver ændring i card_positions automatisk.
-- group_id/session_id slås op via kortet (card_positions har ikke selv disse
-- kolonner længere, jf. gruppe-scoping ovenfor); session_id i loggen er
-- gruppens NUVÆRENDE sitting på ændrings-tidspunktet (historisk markør, ikke
-- et synligheds-filter — se "Session-livscyklus" nedenfor).
-- Samme mønster kan genbruges på chain_links, cards (reveal), private_notes
-- (uden at logge selve note-teksten — kun at en note blev opdateret).
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

-- Private noter — kun forfatteren og Handler kan se dem. GRUPPE-scoped, ikke
-- session-scoped: en spillers noter er ÉN løbende notesbog pr. gruppe, ikke
-- en ny tom side hver sitting. De kan altid LÆSES (også når sessionen er
-- paused, jf. "kan tjekke noter mellem sessions"), men kan kun REDIGERES af
-- spillere når sessionen er 'active' (se RLS — det er selve "frys"-delen af
-- stop-session-kravet).
create table private_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  card_id uuid references cards(id) on delete set null,  -- valgfri: note koblet til et specifikt kort
  body text not null default '',
  updated_at timestamptz default now()
);

-- Event-bus til reveal-interrupt: handler inserter en række når et kort reveals,
-- spillere lytter på INSERT-events via postgres_changes. Adskilt fra selve
-- cards-UPDATE-eventet fordi RLS blokerer UPDATE-events for rækker spilleren
-- ikke måtte se i den tidligere tilstand (revealed=false → true).
-- Migration: 007_reveal_notifications.sql
-- Status: tabel og RLS oprettet, realtime-levering til spillere debugges (se REVEAL_PROBLEM.md)
create table reveal_notifications (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  created_at timestamptz default now()
);
```

**Tilstedeværelse og live-cursorer** (krav: spillere skal kunne se hinandens
tilstedeværelse og musemarkør) gemmes **ikke** i Postgres. Det er for
kortlivet/hyppigt til en database — brug i stedet Supabase Realtime
**Presence** (et ephemeral broadcast-lag ovenpå websocket-forbindelsen):
hver klient sender `{ user_id, display_name, color, cursor_x, cursor_y }`
flere gange i sekundet på en `presence`-kanal scoped til `session_id`. Det
er adskilt fra `postgres_changes`-kanalen som bruges til kort/kæde/noter.

---

## 3. Row Level Security — adgangsprincipper

Generel regel: **alt er scoped til `group_id`**, og en bruger skal stå i
`group_members` for den gruppe for at se noget som helst i den.

```sql
-- Hjælpefunktion: er bruger handler i denne gruppe?
create function is_handler(g uuid) returns boolean as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid() and role = 'handler'
  );
$$ language sql security definer;

-- cards: spillere ser kun revealed ELLER deres eget kort. Handler ser alt (inkl. spoilers).
-- Bemærk: revealed sættes nu automatisk ved insert for spiller-kort, jf. group_settings.
create policy "cards_select" on cards for select using (
  is_handler(group_id)
  or created_by = auth.uid()
  or (revealed = true and exists (
    select 1 from group_members where group_id = cards.group_id and user_id = auth.uid()
  ))
);

-- Spillere kan kun oprette kort mens sessionen er 'active' (pauset = ingen
-- nye inputs). Handler er ikke begrænset af dette — kan forberede når som helst.
create policy "cards_insert_player" on cards for insert with check (
  origin = 'player' and created_by = auth.uid()
  and session_active(group_id)
  and exists (select 1 from group_members where group_id = cards.group_id and user_id = auth.uid())
);

create policy "cards_insert_handler" on cards for insert with check (
  is_handler(group_id)
);

-- card_positions: DELT bord — alle gruppemedlemmer kan SE positioner altid
-- (også når pauset — boardet skal stadig kunne vises, bare ikke ændres).
-- Skrivning kræver enten Handler-rolle, eller at sessionen er 'active'.
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

-- private_notes: KUN forfatter + Handler kan SE (kernekravet). Læsning er
-- ALTID tilladt, også når pauset (kan tjekke noter mellem sessions).
-- Redigering kræver at sessionen er 'active', med mindre man er Handler.
create policy "notes_select" on private_notes for select using (
  author_id = auth.uid() or is_handler(group_id)
);
create policy "notes_write" on private_notes for insert with check (
  author_id = auth.uid() and (is_handler(group_id) or session_active(group_id))
);
create policy "notes_update" on private_notes for update using (
  author_id = auth.uid() and (is_handler(group_id) or session_active(group_id))
);

-- chain_links: alle gruppemedlemmer kan SE kæden altid. Tilføj/fjern kræver
-- Handler eller 'active' session — samme "frys ved pause"-princip som ovenfor.
create policy "chain_select" on chain_links for select using (
  exists (select 1 from group_members where group_id = chain_links.group_id and user_id = auth.uid())
);
create policy "chain_write" on chain_links for all using (
  exists (select 1 from group_members where group_id = chain_links.group_id and user_id = auth.uid())
  and (is_handler(chain_links.group_id) or session_active(chain_links.group_id))
);

-- group_settings: kun Handler kan læse/ændre
create policy "settings_handler_only" on group_settings for all using (
  is_handler(group_id)
);

-- groups: kun synlig for medlemmer (forsiden/dashboardet viser "mine grupper",
-- ikke en offentlig liste over alle grupper på platformen)
create policy "groups_select_member" on groups for select using (
  exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
);

-- groups: kun brugere med can_create_groups = true kan oprette en gruppe
-- (= blive Handler for den). I praksis kun dig selv lige nu.
create policy "groups_insert_authorized" on groups for insert with check (
  created_by = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and can_create_groups = true)
);

-- profiles: en superadmin (dig) kan give/fjerne can_create_groups for andre.
-- Almindelige brugere kan kun se/redigere deres eget display_name.
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and can_create_groups = (select can_create_groups from profiles where id = auth.uid()));
  -- ^ forhindrer en bruger i selv at skrive can_create_groups=true på sig selv
create policy "profiles_superadmin_manage" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_superadmin = true)
);

-- group_assets: alle gruppemedlemmer kan se/downloade, kun Handler kan uploade/slette
create policy "assets_select" on group_assets for select using (
  exists (select 1 from group_members where group_id = group_assets.group_id and user_id = auth.uid())
);
create policy "assets_write_handler_only" on group_assets for all using (
  is_handler(group_id)
);

-- card_assets: følger samme synlighed som det kort de er koblet til (revealed/egen/Handler)
create policy "card_assets_select" on card_assets for select using (
  exists (select 1 from cards c where c.id = card_assets.card_id) -- cards_select policy filtrerer allerede
);
create policy "card_assets_write_handler_only" on card_assets for all using (
  exists (select 1 from cards c where c.id = card_assets.card_id and is_handler(c.group_id))
);
```

**Supabase Storage:** opret en bucket (fx `group-assets`), **privat** (ikke
public), med storage-policies der spejler `group_assets`-reglerne ovenfor:
upload kun hvis `is_handler(group_id)` (udledt af file-path-præfikset
`group_id/...`), download/læs kun hvis brugeren er medlem af gruppen.
Faktiske filer ligger i Storage; `group_assets.storage_path` er referencen.
Hentning af en fil sker via en kortlivet signeret URL (`createSignedUrl`),
ikke en permanent public URL — selv pdf'er/billeder skal gå gennem
adgangskontrol, ikke ligge frit tilgængelige via et gættet link.

---

## 4. App-struktur (forslag, Vite + Vue 3 + Tailwind + supabase-js)

```
/app
├── /login                       ← Supabase magic-link auth (eneste indgang for alle roller)
├── /dashboard                   ← FORSIDE efter login: liste over MINE grupper/sessions
│   │                              (navn + Handlerens beskrivelse), klik → /handler/[groupId]
│   │                              eller /play/[groupId] afhængig af rolle i den gruppe
│   └── /new                     ← "opret gruppe", kun synlig/tilgængelig hvis can_create_groups = true
├── /handler/[groupId]          ← hemmeligt Handler-interface
│   ├── board (samme delte board, men ser revealed=false kort også, markeret som spoiler)
│   ├── settings (auto_reveal_player_cards og fremtidige toggles, pr. gruppe/session,
│   │             invite-link regenerering, gruppe-beskrivelse)
│   ├── assets (upload pdf/billede/.md/tekst, attach til kort, se afsnit "Forberedelses-assets")
│   ├── activity (aktivitetslog — se afsnit 7.1)
│   └── notes (kan læse ALLE spilleres private noter)
├── /play/[groupId]             ← spillerens visning — SAMME delte board som alle andre ser
│   ├── board (kollaborativt board: alle reveals, live cursorer, drag/minimize/rød tråd)
│   └── notes (kun egne private noter, CRUD)
└── /join/[inviteCode]          ← landing page for invite-link → login → group_members insert
```

**Rolle-modellen er superadmin → Handler → spiller, ikke flad.** `is_superadmin`
(kun dig i praksis) kan give andre brugere `can_create_groups = true`, hvorefter
de kan oprette egne grupper og automatisk blive Handler for netop dem (stadig
bare almindelig spiller i grupper andre opretter). Lige nu er der ingen UI til
at administrere dette — det sættes manuelt i databasen, fordi kun du bruger
det. En `/admin`-side til at toggle'e `can_create_groups` for andre brugere er
en oplagt fremtidig udvidelse, men ikke nødvendig i v1.

**Forberedelses-assets** (pdf, billede, .md/tekst-fil) uploades af Handleren
til en gruppe (evt. scoped til en bestemt session) via `/handler/[groupId]/
assets`. Når Handleren opretter eller redigerer et kort, kan et eller flere
allerede-uploadede assets vælges og knyttes til kortet (`card_assets`).
Spillere ser/downloader vedhæftede assets på kort de har adgang til (samme
synlighedsregel som kortet selv), men uploader ikke selv — kun spiller-
oprettede *kort* (clue-kort, jf. `cards.origin = 'player'`) er noget
spillerne selv skaber; filupload er et Handler-only forberedelsesværktøj.

### Login/invite-flow, udfoldet

1. **Handler opretter gruppe** (fra `/handler` efter eget login) → indsætter
   række i `groups`, `invite_code` genereres automatisk af kolonnens default.
2. **Handler deler invite-linket** (`/join/<invite_code>`) med sine spillere
   uden om platformen — SMS, Discord, hvad de nu bruger.
3. **Spiller åbner `/join/<invite_code>`.** Siden slår koden op i `groups`
   (uden at kræve login først — det er et offentligt, men hemmeligt-ved-
   ukendelighed link). Findes koden ikke eller er den udløbet → fejlside med
   besked om at bede Handler om et nyt link.
4. **Spiller logger ind via Supabase magic-link** (`/login`, men med
   `invite_code` gemt i URL/state, så flowet kan fortsætte efter login).
   Supabase-js håndterer selv session/token i browseren — ingen egen
   kode til det.
5. **Efter bekræftet login:** indsæt række i `group_members` med
   `role = 'player'` og `group_id` fra koden, **hvis** brugeren ikke allerede
   er medlem (idempotent — ellers fejler en person der klikker linket igen).
6. **Redirect til `/play/[groupId]`.**

**Udløb/regenerering af `invite_code`** (din pointe i 7.3 — koden bør ikke
leve for evigt af sikkerhedsmæssige grunde):

`invite_expires_at` står allerede i `groups`-tabellen i afsnit 2.

- Sættes typisk til fx 7 dage fra oprettelse, eller Handler kan sætte den
  manuelt (engangsbrug for én bestemt spiller, fx).
- `/join/[inviteCode]` tjekker `invite_expires_at > now()` i samme query som
  kode-opslaget — udløbet kode behandles som "findes ikke".
- Handler-UI bør have en **"Generér nyt invite-link"**-knap: opdaterer
  `invite_code` (nyt random-tegn) + `invite_expires_at` (ny dato). Dette
  ugyldiggør automatisk det gamle link, hvilket er den eneste "revoke"-
  mekanisme der er nødvendig — der er ikke et separat invite-status-felt.
- Allerede-medlemmer (`group_members`) påvirkes ikke af at koden udløber —
  udløb forhindrer kun *nye* tilmeldinger, det smider ikke eksisterende
  spillere ud.

### Session-livscyklus: "stop session" / "start ny session"

Dette er kernen i 8.2: Handler skal kunne stoppe en spilleaften midlertidigt
og fortsætte præcis hvor man slap, næste gang.

**Hvorfor boardet blev gjort gruppe-scoped i stedet for session-scoped**
(se ændringerne i afsnit 2): hvis `card_positions`/`chain_links`/
`private_notes` havde været knyttet til den enkelte session, ville en ny
session pr. definition starte med et tomt board — det er det modsatte af
"fortsætter hvor man slap". Løsningen er at lade selve boardet (kort,
positioner, kæde, noter) leve på gruppe-niveau permanent, og lade `sessions`
være en ren tidsmarkør/log-enhed med et status-flag, ikke en data-partition.

**Flow:**

1. **Stop session:** Handler trykker "Stop session" i menuen. Klienten
   sætter `sessions.status = 'paused'` på gruppens `current_session_id`.
   Intet andet skrives/ryddes — kort, positioner, kæde og noter ligger
   præcis hvor de var.
2. **Realtime-broadcast af pause:** Da `sessions` opdateres, fanger alle
   spilleres `postgres_changes`-subscription ændringen øjeblikkeligt.
   Spillerens UI reagerer ved at vise en "Session er pauset af Handler"-skærm
   over boardet (board vises stadig **read-only** bagved — ikke en blank
   side) og deaktiverer drag/opret/kæde-knapper. RLS blokerer skrivningerne
   alligevel (se nedenfor), så UI-låsen er for god UX, ikke selve
   sikkerheden.
3. **Mens pauset:** spillere kan stadig læse boardet og deres egne private
   noter (`notes_select` har ingen pause-betingelse), men kan ikke skrive
   til `cards`/`card_positions`/`chain_links`/`private_notes` — det er
   "frys"-delen af kravet, håndteret af `session_active()`-tjekket i RLS-
   policies i afsnit 3. Handler er undtaget fra denne begrænsning og kan
   stadig forberede/redigere.
4. **Ingen forced logout** (afklaret ovenfor) — spilleren behøver ikke logge
   ud, pause-skærmen + RLS er nok. De kan vælge selv at logge ud hvis de vil.
5. **Start ny session:** Handler trykker "Start ny session" (fra samme
   gruppe-menu). Det opretter en ny række i `sessions` med `status='active'`,
   sætter den forrige sessions `status='ended'`, og peger gruppens
   `current_session_id` på den nye. Boardet er allerede der — der er intet
   at genskabe.

```sql
-- Eksempel på de to handlinger som RPC-funktioner (kaldes fra klienten via
-- supabase.rpc(), køres med brugerens egne rettigheder — kun Handler kan
-- faktisk gennemføre dem pga. RLS-checket inden i funktionen)
create function stop_session(target_group uuid) returns void as $$
begin
  if not is_handler(target_group) then raise exception 'kun Handler'; end if;
  update sessions set status = 'paused'
  where id = (select current_session_id from groups where id = target_group);
end;
$$ language plpgsql security invoker;

create function start_new_session(target_group uuid, new_label text) returns uuid as $$
declare
  new_id uuid;
begin
  if not is_handler(target_group) then raise exception 'kun Handler'; end if;
  update sessions set status = 'ended', ended_at = now()
  where id = (select current_session_id from groups where id = target_group);
  insert into sessions (group_id, label, status) values (target_group, new_label, 'active')
  returning id into new_id;
  update groups set current_session_id = new_id where id = target_group;
  return new_id;
end;
$$ language plpgsql security invoker;
```

**Boardet er ét delt, kollaborativt rum** — ikke et personligt dashboard pr.
spiller. Alle der er i sessionen ser samme kort, samme positioner, samme røde
tråd, og hinandens musemarkører i realtid (som et multiplayer whiteboard).
Det eneste personlige/private lag er noterne.

Spillerne kan på dette delte board:
- minimere et kort, så det lægger sig i en bunke i bunden (`card_positions.minimized = true`)
- selv vælge at trække det op igen / placere det fritliggende (`minimized = false`, sætte `x`/`y`)
- flytte rundt på frit placerede kort (opdaterer `x`/`y` live for alle)
- tilføje/fjerne et kort fra den røde tråd, og vælge kæde-nummer

Realtime: to lag.
1. `postgres_changes` på `cards`, `card_positions`, `chain_links`, `chain_state`
   — det persistente, delte board-indhold.
2. Realtime **Presence** (ikke i databasen) for cursorer og "hvem er online"
   — se afsnit 2 ovenfor.

Dette erstatter `BroadcastChannel` 1:1 i koncept — samme event-model, bare over
internettet, med flere samtidige redaktører, og adgangskontrol indbygget i
databasen i stedet for "alle på maskinen ser alt".

UI-renderingslaget (korttype-skins, kæde-animation) fra det nuværende
`display.html`/`control.html` kan i høj grad **genbruges som logik**, bare
flyttet fra vanilla-JS-DOM-manipulation til Vue-komponenter (én komponent pr.
korttype, samme opdeling som de nuværende `engine/renderers/*.js`-filer i
`platform/`), og med drag-state nu drevet af `card_positions` i stedet for
lokal `pinned`-liste. `hashInt`/`hashRange`-mønstret for deterministisk visuel
variation (rotation, stak-offset) kan kopieres direkte ind som almindelige
JS-hjælpefunktioner — det er ikke React/Vue-specifikt.

---

## 5. Migreringsstatus

| Trin | Status |
|------|--------|
| 1. Supabase-projekt + skema + RLS | ✅ Migrations 001–007 kørt |
| 2. Auth + invite-flow + dashboard | ✅ Bygget |
| 3. Delt board-visning, realtime | ✅ Migration 006 fikser realtime publication |
| 4. Handler-interface: opret/reveal/indstillinger | ✅ Bygget |
| 5. Spiller-side: kort + noter | ✅ Bygget |
| 6. Drag/minimize, live-sync | ✅ Bygget |
| 7. Rød tråd, realtime-sync | ✅ Bygget |
| 8. Presence / live cursorer | ⬜ Ikke bygget endnu |
| 9. Session-livscyklus | ✅ Bygget |
| 10. Reveal interrupt til spillere | 🔴 Bygget men virker ikke — se REVEAL_PROBLEM.md |
| 11. Delta Green UI-æstetik | ✅ Bygget (v0.513) |

## 6. Beslutninger (afklaret)

- **Tilstedeværelse/cursorer:** Ja — spillere ser hinandens online-status og
  musemarkør live på det delte board (Presence, se afsnit 2).
- **Auto-reveal af spiller-kort:** Ja, som default (`group_settings.auto_reveal_player_cards = true`).
  Skal kunne styres af Handler — både pr. gruppe (default) og overrides pr.
  session (`sessions.auto_reveal_override`), så det kan justeres løbende uden
  kodeændring.
- **Skala:** Kun én samtidig gruppe i praksis lige nu. Skemaet er stadig
  multi-tenant (kostede ikke noget ekstra at designe det rigtigt), men der er
  ingen grund til at bekymre sig om Supabase free-tier-grænser eller
  skalering før det rent faktisk bliver relevant.
- **Forhold til nuværende værktøj:** Nyt, separat projekt. `dashboard/`
  (dette nuværende lokale værktøj) rører vi ikke — det fortsætter som det er.
  Mappen er kopieret til `platform/` som reference/inspiration til Claude Code
  (inkl. den ufærdige `engine/`/`control/`-opsplitning og `terminals.js` fra
  17. juni, som er bevaret uændret efter eksplicit ønske — de er ikke en del
  af den nye Supabase-arkitektur, men kan plukkes idéer/kode fra).
- **Forside-flow:** Login først (magic-link), derefter `/dashboard` med en
  liste over de grupper/sessions brugeren allerede er medlem af (navn +
  Handlerens beskrivelse). Gruppelisten er aldrig offentlig/synlig for
  ikke-loggede-ind brugere — kun nye spillere via et invite-link kommer ind
  uden allerede at være medlem.
- **Handler-rolle:** Du er superadmin. Lige nu er du den eneste der kan
  oprette grupper (`can_create_groups`), men modellen er bygget til at du
  senere kan give andre brugere samme ret, hvis de vil køre deres egen
  Delta Green-gruppe på platformen. Ingen UI til dette i v1 — sættes manuelt
  i databasen indtil det bliver relevant.
- **Asset-upload:** Kun Handler uploader forberedelsesmateriale (pdf,
  billede, .md/tekst) til en gruppe, og vedhæfter det til kort. Spillere
  opretter selv *kort* (clues), men uploader ikke filer — det er bevidst en
  Handler-only forberedelsesfunktion, ikke en delt fil-deling. Max 20 MB pr.
  filupload (pragmatisk grænse, ikke sikkerhed — kun du uploader i praksis).
- **Frontend-stack:** Vue 3 + Vite + Tailwind (ikke React) — `supabase-js`
  er framework-agnostisk, og du er selv erfaren i Vue, hvilket vejer tungere
  end nogen teknisk forskel mellem de to.
- **Session-pause/resume:** Se det nye afsnit "Session-livscyklus" under
  afsnit 4 — boardet er gjort gruppe-scoped (ikke session-scoped) netop for
  at understøtte "fortsæt hvor du slap". Pause er en blød UI-skærm + RLS-
  blokering, intet reelt forced logout.
- **Terminal-feature (ROADMAP punkt 1):** Udskudt — ikke en del af v1 af
  platformen. Tages op igen som en selvstændig udvidelse senere.
- **Deploy:** Netlify. Husk `.gitignore` for `.env`, og en regel i
  `platform/CLAUDE.md`/Claude Code-instruktioner om aldrig at læse eller
  committe `.env`-filer.
- **Test:** Du har en anden person klar til at hjælpe med RLS-/flow-test med
  rigtige flere brugere, ikke kun dig selv som Handler.

## 7. Afklaret: aktivitetslog, "sidste skriv vinder", og invite-flow

**7.1 — Handler ser alt, inkl. historik.** Bekræftet krav: Handler skal ikke
kun kunne se *nuværende* tilstand (det dækkede de gamle policies allerede via
fælles SELECT på `card_positions`/`chain_links`), men en **historisk log**
over hvem der gjorde hvad. Løst med den nye `activity_log`-tabel (afsnit 2):
fyldt af Postgres-triggers (ikke klient-kald, så den ikke kan springes over),
låst til Handler-only via RLS-policy nedenfor, og tænkt vist som en
sammenklappelig "Aktivitetslog"-sektion i Handler-menuen — en simpel liste
("Andreas flyttede *Politirapport* 14:32", "Anne tilføjede rød tråd mellem
*Vidneudsagn* og *Telefonlog* 14:35"), ikke en separat side.

```sql
create policy "activity_handler_only" on activity_log for select using (
  is_handler(group_id)
);
```

Trigger-mønstret fra afsnit 2 (`log_position_change`) bør gentages for
`chain_links` (insert/delete) og `private_notes` (kun at en note blev
opdateret — **ikke** selve teksten, det ville underminere hele pointen med
private noter) og evt. `cards` (reveal-events).

**7.2 — Hvad betyder "sidste skriv vinder" konkret?** Det betyder *ikke*
"først til at gribe kortet vinder" — det betyder **den seneste database-
skrivning der rent faktisk når frem til Postgres, vinder, uanset hvem der
startede først**. Konkret eksempel: Andreas begynder at trække et kort kl.
14:32:00.000 og slipper det kl. 14:32:01.500 ved position (300, 400). Anne
begynder at trække *samme* kort kl. 14:32:00.800 (mens Andreas stadig
trækker) og slipper det kl. 14:32:01.200 ved position (150, 250). Selvom
Andreas startede først, ankommer Annes UPDATE til databasen *før* Andreas'
(kl. 01.200 vs. 01.500) — så Annes position bliver overskrevet af Andreas'
0,3 sekund senere. Resultatet er ikke forudsigeligt for spillerne i øjeblikket
det sker; det eneste der er garanteret er, at den sidste UPDATE der commits,
er den der står tilbage. Der er ingen sammenfletning eller fejlmelding — bare
overskrivning.

Til bordrollespil-tempo (kort flyttes typisk enkeltvis, ikke i intens
konkurrence) er det fint at lade det være simpelt sådan. Hvis det i praksis
bliver et problem (to spillere rammer samme kort ofte), er den lette
mitigering at bruge Presence (samme lag som cursorerne) til at broadcaste
"bruger X holder lige nu i kort Y" — så UI'et kan vise en lille markering/
låse-ikon på kortet, **uden** en reel server-side lock. Det forhindrer ikke
konflikten, men gør den synlig før den sker. Ikke bygget i v1, men nævnt her
som den naturlige næste mitigering hvis det bliver relevant.

**7.3 — Login/invite-flow.** Se det udfoldede afsnit "Login/invite-flow,
udfoldet" under afsnit 4 ovenfor — inkl. `invite_expires_at`-kolonnen og
regenererings-mekanikken.

---

## 8. Inden Claude Code — overset/uafklarede ting

De fleste punkter herunder er nu afklaret (se §6). Det der står tilbage som
reelt åbent eller som en konkret huske-ting til opsætningen:

- **`cards.data jsonb` er stadig fri form.** Skemaet siger bevidst ikke noget
  om hvad der står i `data` for hver korttype (briefing/npc/bevis/unnatural/
  terminal/comms/clue) — det er en 1:1-arv fra `content.js`'s løse struktur.
  Før Vue-komponenterne for hver korttype bygges, bør du skrive et konkret
  TypeScript-interface (eller bare en kommentar-skitse) for `data`'s form pr.
  type, ellers gentages "ny korttype = 4 steder at opdatere, ellers fejler
  det stille"-problemet fra det gamle værktøj (se `dashboard/CLAUDE.md`) —
  bare nu spredt over Vue-komponent + RLS + Postgres-constraint i stedet for
  4 JS-filer. **Dette er det eneste punkt der reelt bør afklares før du går
  i gang i Claude Code** — resten kan besluttes løbende.
- **Genopkobling/"ghost cursors".** Realtime Presence rydder normalt selv op
  når en klient lukker forbindelsen pænt, men ved netværksdrop/sove-bærbar
  kan en cursor "hænge" synlig for andre i nogle sekunder før timeout. Værd
  at vide før du undrer dig under test — det er forventet Presence-adfærd,
  ikke en bug. (Bekræftet — ingen ændring nødvendig.)
- **Mobil/responsivt.** Spillere logger sandsynligvis ind fra telefon ind
  imellem (fx for at læse private noter mellem sessions, jf. §6). Det delte
  board med drag/cursorer er primært designet til desktop-brug — stadig
  uafklaret om mobil skal have en forenklet visning (read-only board, ingen
  drag) eller forsøge fuld parity. Kan besluttes når du er der i kodningen.
- **Miljøvariabler/deploy:** Netlify (afklaret, §6). Konkret opsætning:
  `.env` i `.gitignore` fra dag ét, `SUPABASE_URL`/`SUPABASE_ANON_KEY` sættes
  som Netlify environment variables (ikke i repoet), og en linje i
  `platform/CLAUDE.md` der siger Claude Code aldrig må læse eller committe
  `.env`-filer.
- **Test:** Du har en anden person klar til RLS-/flow-test (afklaret, §6).
  Test stadig konkret som: log ind som Handler i én browser, som spiller i
  en anden (eller incognito), og bekræft at private noter, spoiler-kort og
  pause-tilstanden faktisk virker som forventet for begge roller — ikke kun
  at koden compilerer.

---

## 9. Korttype-skema (`cards.data`)

Det sidste åbne punkt fra §8 — nu afklaret. Formen pr. korttype er en 1:1-
oversættelse af de felter `content.js` allerede bruger (se `dashboard/
content.js` og kommentaren i toppen af filen), bare formaliseret som
TypeScript-interfaces. **Gennemtvinges kun i TypeScript/Vue-laget, ikke som
Postgres CHECK constraints** — `data`-kolonnen forbliver fri `jsonb`. Det er
et bevidst valg: skemaet er stadig i bevægelse, og en forkert form giver i
værste fald "kortet ser forkert ud", ikke datakorruption nogen andre rammes
af. Hvis det engang bliver relevant (flere uafhængige indholdsforfattere,
højere risiko), kan CHECK-constraints lægges på senere uden at ændre denne
grundform.

```ts
// types/cards.ts — én interface pr. cards.type

interface BriefingData {
  heading: string;
  stamp: string;
  body: string;          // kan indeholde ||sværtet tekst||
}

interface HandoutData {
  caseNumber: string;
  body: string;
  imageUrl?: string;     // FALDBACK: eksternt link. Primær vej for billeder
                          // er at vedhæfte et group_asset via card_assets —
                          // se note nedenfor.
}

interface NpcData {
  name: string;
  role: string;
  affiliations: string[];
  notes: string;
  imageUrl?: string;      // faldback, jf. ovenfor (erstatter det gamle photoUrl)
}

interface BevisData {
  exhibitNumber: string;
  foundAt: string;
  description: string;
  analysis?: string;      // kan indeholde ||sværtet tekst||
  imageUrl?: string;      // faldback, jf. ovenfor
}

interface UnnaturalData {
  title: string;
  sanCost?: string;        // fri tekst, fx "1/1d6 SAN" — ikke et struktureret tal
  body: string;            // kan indeholde ||sværtet tekst||
}

interface TerminalData {
  // v1: kun visning. interactive/commands[] tilføjes som skema-udvidelse
  // den dag terminal-interaktivitet (ROADMAP punkt 1) reelt bygges — udskudt.
  lines: string[];
  showCursor?: boolean;
}

interface CommsData {
  sender: string;
  message: string;
  time?: string;           // fri tekst, in-fiction klokkeslæt — ikke en timestamp
}

type CardType = 'briefing' | 'handout' | 'npc' | 'bevis' | 'unnatural' | 'terminal' | 'comms';
```

**Billeder: primært via asset-systemet.** `imageUrl`/`photoUrl` fra det
gamle værktøj erstattes af `card_assets` (afsnit 2) som den primære vej —
et billede uploades én gang som et `group_asset` og kan vedhæftes et eller
flere kort, hentet via en kortlivet signeret URL (samme adgangskontrol som
alle andre assets). Det valgfri `imageUrl`-felt i `data` er en **faldback**
til et hurtigt eksternt link, når et rigtigt upload er overkill — og det
sparer Storage-plads for engangslinks. Vue-komponenten for et korttype bør
derfor tjekke `card_assets` (kind='image') først, og kun falde tilbage til
`data.imageUrl` hvis intet asset er vedhæftet.

**Spiller-oprettede kort bruger samme typer og felter som Handler.**
`origin = 'player'` styrer kun *rettigheder* (RLS — hvem må indsætte/redigere,
og hvornår sessionen tillader det), ikke en anden datastruktur. Der er ingen
RLS-begrænsning på hvilken `type` en spiller vælger — en spiller kan i
princippet oprette et `npc`- eller `unnatural`-kort med samme felter som
Handler ville bruge. Hvis du vil begrænse hvilke typer der reelt er
meningsfulde for spillere at vælge i UI'et (fx kun `bevis`/`comms`, ikke
`briefing`, som tematisk er Handlerens mission-instruks), er det en **UI-
beslutning** i type-vælgeren ved "opret kort", ikke en database-regel — kan
justeres frit uden migration.

**Redaktionssyntaks (`||tekst||`) er ikke en del af skemaet i sig selv** —
det er en tekst-konvention inde i de fri-tekst-felter (`body`, `notes`,
`description`, `analysis`, `message`), parset i Vue-komponenten ved render,
præcis som `renderRedacted()` gør i det nuværende `display.html`.
