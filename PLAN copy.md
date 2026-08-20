# Platform — Plan (active build queue)

This is the working queue: only items currently tagged `(p1)` in
`STATUS.md` — the ones needed before the next test — live here, grouped by
shared work with a suggested build order.

**How this file works with `STATUS.md`:** an item lives in exactly one file
at a time, never both. Marking something `(p1)` in `STATUS.md` means it
moves here (cut from `STATUS.md`, pasted here). Shipping it means it moves
the other way — cut from here, and a short entry added to `STATUS.md`'s
Resolved (bug) or Built (feature) section. If priorities change, an
unstarted item can move back to `STATUS.md`'s Backlog/Playtester feedback
un-tagged. No item should ever be duplicated across both files.

The build order below is a suggestion (roughly: cheapest/most-requested
first, biggest shared-infrastructure lift grouped together so it's one
focused push rather than three separate ones). Reorder freely.

---

## 1. Quick character-sheet wins

Both are small, isolated frontend changes — no schema/infra work, high
value for players actively creating characters right now.

Louise note: Before working with character-sheet wins we should check the database logic. 

### Stats: running total for the six base stats
A small automatic counter next to the stats section showing the sum of the
six base stats (STR, CON, DEX, INT, POW, CHA) against the point budget, e.g.
`Total: XX / 72` — so players don't need mental math or a spreadsheet to
check they haven't overspent. The 72 cap should be editable by the Handler
(some agents may be allowed to go over/under by exception).

> **Original (da):** "En lille automatisk tæller ud for stats-sektionen, der
> viser den samlede sum af de 6 grund-stats (STR, CON, DEX, INT, POW, CHA).
> Da vi har 72 point til rådighed, sidder man hurtigt og laver hovedregning
> eller åbner Excel for at sikre, at man ikke har brugt for meget. En lille
> Total: XX / 72 tæller ville være en kæmpe hjælp! Gør evt. sådan at du selv
> kan ændre 72, og du kan jo sagtens tillade den at gå over/under hvis nu
> der er nogen særlige der får lov til det."

### Bonds: new Bond defaults to current CHA
When a player adds a new Bond, pre-fill its starting value with the
character's current CHA score (e.g. CHA 11 → new Bond starts at 11). Stays
manually editable afterward, since Bonds erode with play.

> **Original (da):** "Når man tilføjer et nyt Bond, tildeles feltet
> automatisk karakterens CHA-værdi som startpunkt (f.eks. hvis min CHA er
> 11, starter et nyt Bond på 11 point). Det sparer et indtastningstrin og
> gør det nemt at komme i gang. Feltet skal selvfølgelig stadig kunne
> redigeres manuelt efterfølgende, når jobbet langsomt slider på vores
> relationer... stakkels eks-kone 😛"

---

## 2. Handler: board lock, separate from session stop

Self-contained: new state + RLS write-gate + a lock overlay for players
(can likely reuse the pattern already built for the reveal interrupt).

### Lock the board without pausing the session
A dedicated lock the Handler can toggle to freeze the other players'
ability to interact with the board, independent of starting/stopping the
session. Related to `STATUS.md`'s Open bug #2 (session pause isn't visible
to players in real time) but distinct — that bug is about pausing becoming
visible/enforced; this is a separate lock control that doesn't touch
session state at all.

**Louise's spec:** two buttons for the Handler in the upper right corner.
One ends a session — unchanged, does exactly what it does today. A second,
new button just pauses for input and locks the players' screen as
described above.

> **Original (da):** "mulighed for handler kan 'låse' for os andre uden at
> pause sessionen (den skrev du dig nok også bag øret :P)"

---

## 3. Character sheet: three-tier skill breakdown

Bigger than the two quick wins above — likely touches how skill values are
stored (single percentage today → base + bonus + earned), not just the UI.
Worth designing the data shape before building.

### Split each skill into Base / Professional / Earned
Show each skill as three visible, separately editable layers instead of one
number:
- **Base** — the standard value from the Agent's Handbook / Need to Know.
- **Professional bonus** — click a skill once or twice at character
  creation to add +20% / +40% (max +80% total); a third click resets it to
  zero bonus.
- **Earned points** — a field for the +1d4% gained after a session when a
  roll on that skill was failed.

Total shown = Base + Professional + Earned. Player's stated reasoning: makes
it obvious how a skill's final value was built, easier for players to
self-check, and lets the Handler follow a character's development over time
and catch accidental miscalculations.

> **Original (da):** "Jeg vil foreslå at opdele Skills i tre synlige lag som
> brugeren udfylder: Base Skill: Standardværdien fra Agent's Handbook / Need
> to Know. Professional Bonus: Når man opretter karakteren, kan man trykke
> på en skill 1 eller 2 gange (f.eks. markeret med 1-2 små prikker eller
> felter ud for evnen), der lægger +20% eller +40% til (op til max 80%). Et
> tredje tryk fjerner/resetter. Optjente Points: Felt til de +1D4% point,
> man optjener efter en spilsession, når man har fejlet et slag. Det gør det
> krystalklart, hvordan ens endelige skill-værdi er opstået (Base + Bonus +
> Optjent = Total), det gør det nemmere for os at holde styr på. Samtidig
> tænker jeg at det er supersjovt for dig som Handler at kunne følge med i
> vores karakters udvikling over tid – og fange hvis en af os ved et uheld
> har regnet forkert."

---

## 4. Player identity & presence (shared infrastructure)

Grouped together — and cross-referenced by Louise herself — because all
three share the same underlying build: image upload/storage, plus a live
realtime channel for cursor/token position (a genuinely new kind of
realtime feature, not the existing postgres_changes sync). Biggest lift in
this queue; makes sense as one focused push rather than three separate ones.

### Avatar + supplementary file upload
Let players upload a profile picture/avatar for their character, plus a
supplementary file (e.g. an extended dossier or a PDF/HTML sheet with
backstory).

> **Original (da):** "Mulighed for at uploade et profilbillede/avatar samt
> en supplerende fil (f.eks. et udvidet dossier eller PDF/HTML-ark med
> baggrundshistorie)."

### Player token on the visual board
Upload a profile picture as a token, shown as a cursor/marker on the visual
board — reuses the avatar from above.

### Presence: live mouse cursors
Players see each other's position on the canvas in real time.

---

## 5. Visual board polish

Lower urgency than the above for the next test — trail these behind unless
priorities shift.

### Red thread: many-to-many connections
Currently a linear chain; players/Handler want to connect cards in a graph,
not just a single ordered sequence.

### Fullscreen image viewer
Possibility to fullscreen an image, to properly read a PDF/PNG or other
image containing text.
