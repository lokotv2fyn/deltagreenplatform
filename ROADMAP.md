# Platform — roadmap

## Bygget (v0.513)

### Auth og adgang
- Magic link login (Supabase Auth)
- Invite-flow: handler genererer link, spiller tilmeldes automatisk
- RLS: handler ser alt inkl. spoilers, spillere ser kun revealed kort + egne
- Router guard: handler-route beskyttet mod spillere

### Board
- Kort: opret, rediger, slet — handler og spiller med separate tilladelser
- Reveal: handler kan reveal/skjule kort for spillere
- Rød tråd: tilføj/fjern/omsorter kort i kæde, synlighed kan skjules af handler
- Realtime sync: alle ændringer propagerer live til alle klienter (migration 006 + 007)
- Visuelt canvas: drag-and-drop positionering, sidebar med kortdetaljer

### Session
- Start/stop/pause session
- Boardet er gruppe-scopet og overlever session-stop

### Spillerside
- Board-tab: revealed kort + rød tråd
- Visuelt tab: samme canvas som handler
- Private noter: koblet til kort, kun forfatter + handler kan se
- Karakterark: fuld Delta Green karakter med stats, skills, bonds

### Handler-interface
- Board-tab med spoiler-visning
- Agenter-tab: læs alle spilleres karakterark
- Spillernoter-tab: handler kan læse alle private noter
- Aktivitetslog: hvem gjorde hvad og hvornår
- Indstillinger: gruppenavn, beskrivelse, invite-link, auto-reveal toggle

### UI
- Delta Green æstetik: monospace, skarpe kanter, grøn palette, mørk baggrund
- Visuelt board: baggrundsbillede med dot-grid overlay, fixed til viewport
- Login: Jersey 10 font, baggrundsbillede

---

## Næste prioriteter

1. **Reveal interrupt** — handler-reveal skal afbryde spilleren med fullscreen overlay (se REVEAL_PROBLEM.md)
2. **Brugernavn** — spillere sætter eget display name (nu: email-præfiks)
3. **Komm-kort label** — fjern "in-fiction" fra tidspunkt-felt

---

## Fremtid

- Presence: live musemarkører på visuelt canvas
- Spiller-tokens på canvas
- Rød tråd: mange-til-mange forbindelser, drag-and-drop direkte på canvas
- Arkivér operation / start ny
- Interaktiv terminal-korttype
- Landingpage: in-character kodeord
- Mobil-optimering (read-only board, ingen drag)
