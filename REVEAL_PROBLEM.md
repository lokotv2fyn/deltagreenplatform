# Reveal Interrupt — Problem & forsøg

## Hvad vi vil opnå

Når handler revealer et kort (sætter `revealed = true`), skal spilleren afbrydes uanset hvilken tab de står i. Et overlay dækker hele skærmen — enten en dramatisk "nyt bevis"-modal eller en retro SMS-stil for `comms`-kort. Spilleren lukker det aktivt (ikke auto-dismiss).

---

## Symptomer

1. **Interrupt vises ikke** — spilleren ser ingenting når handler revealer.
2. **Kortet dukker op på canvas** — efter vi fik realtime til at virke (migration 006), ser spilleren kortet dukke op på det visuelle board, men ingen interrupt.
3. **Overlay ikke fullscreen** — når interrupt ENGANG viste sig (i tidlige tests), dækkede den ikke hele skærmen. Rettelse: Interrupts har aldrig været der.

---

## Relevante filer

| Fil | Rolle |
|-----|-------|
| `src/components/RevealInterrupt.vue` | Overlay-komponenten. SMS-variant + generisk variant. |
| `src/stores/board.js` | Pinia store. `setRevealed()`, `subscribeRealtime()`, `lastRevealedId`. |
| `src/views/play/PlayView.vue` | Spillerens view. Watcher på `board.lastRevealedId`, `revealQueue`, `interruptCard`. |
| `supabase/migrations/006_realtime_publication.sql` | Tilføjer tabeller til Supabase Realtime-publikation (kritisk fix). |
| `supabase/migrations/007_reveal_notifications.sql` | Ny notifikationstabel som event-bus for reveals (seneste forsøg, ikke testet). | Rettelse: Er testet og virkede heller ikke.

---

## Root causes vi har identificeret

### 1. Tabeller ikke i Supabase Realtime-publikation (løst)
Ingen `ALTER PUBLICATION supabase_realtime ADD TABLE ...` i migrationerne. Uden dette sender `postgres_changes` aldrig events overhovedet. **Fix:** Migration 006. Efter dette virker realtime-synkronisering (nye kort dukker op live).

### 2. RLS blokerer postgres_changes UPDATE-events for spillere
Når handler ændrer `revealed` fra `false` → `true` på et kort spilleren ikke måtte se (fordi `revealed = false`), sender Supabase Realtime muligvis ikke UPDATE-eventet til spilleren. Spillerens SELECT-policy ser kort med `revealed = true OR created_by = auth.uid()` — men eventet for selve ændringen sendes baseret på ROW'ens *tidligere* state (som var usynlig). Dette er den sandsynlige root cause for at interrupt ikke trigges.

### 3. Broadcast upålideligt på blandede kanaler
Supabase Realtime Broadcast leverer ikke konsistent til kanaler der også har `postgres_changes` konfigureret. Vi har ikke kunnet bekræfte at broadcasts overhovedet når frem til spilleren.

---

## Hvad vi har forsøgt (kronologisk)

### Forsøg 1: Detektering via Realtime UPDATE-event i board store
Lyttede på `event: 'UPDATE'` i `subscribeRealtime`. Tjekkede `payload.new.revealed === true` og om kortet ikke var synligt før. Problemet: spilleren modtager muligvis aldrig UPDATE-eventet pga. RLS (se root cause 2).

```js
// board.js
.on('postgres_changes', { event: 'UPDATE', table: 'cards', filter: `group_id=eq.${groupId}` },
  async (payload) => {
    const wasJustRevealed = payload.new?.revealed === true
      && !cards.value.find(c => c.id === payload.new.id)?.revealed
      && !pendingRevealIds.has(payload.new.id)
    await loadBoard(groupId)
    if (wasJustRevealed) revealQueue.value.push(payload.new.id)
  })
```

### Forsøg 2: Watch på board.cards i PlayView
Watchede `board.cards` reaktivt fra PlayView. Detekterede nye kort med `revealed: true` der ikke var i `seenRevealedIds`. Problem: `watch` triggede enten aldrig (Vue reaktivitets-timing) eller triggede for tidligt (før `watchActive` flag var sat).

```js
// PlayView.vue
watch(() => board.cards, (cards) => {
  if (!watchActive) return
  for (const card of cards) {
    if (card.revealed && !seenRevealedIds.has(card.id)) {
      seenRevealedIds.add(card.id)
      revealQueue.value.push(card.id)
    }
  }
})
```

### Forsøg 3: Supabase Broadcast på dedikeret kanal (`reveals:groupId`)
Handler sender broadcast, spilleren lytter. Problem: navnemismatch mellem hvad handler sendte på og hvad spilleren lyttede på. Derudover: channel var måske ikke i SUBSCRIBED state når `send()` kaldtes.

```js
// board.js setRevealed
revealChannel.send({ type: 'broadcast', event: 'card-revealed', payload: { cardId } })

// PlayView.vue
supabase.channel(`reveals:${groupId}`)
  .on('broadcast', { event: 'card-revealed' }, ({ payload }) => { ... })
  .subscribe()
```

### Forsøg 4: Broadcast på `board:groupId` (to instanser, samme navn)
Handler sender på main board-kanal, spillerens PlayView lytter på ny instans med samme navn. Problem: Supabase-js kan ikke håndtere to channel-instanser med identisk navn fra samme klient pålideligt — broadcasts ender muligvis i den forkerte instans.

### Forsøg 5: Broadcast listener i board store's kanal + `lastRevealedId` ref
Flyt broadcast-lytteren ind i board store-kanalens `.on()`-kæde (samme objekt der sender). Eksponer `lastRevealedId` som reaktiv ref. PlayView watcher den. Problem: broadcast leveres stadig ikke konsistent — vi kan ikke bekræfte at spilleren faktisk modtager det.

```js
// board.js subscribeRealtime
.on('broadcast', { event: 'card-revealed' }, async ({ payload }) => {
  await loadBoard(groupId)
  lastRevealedId.value = payload.cardId
})

// PlayView.vue
watch(() => board.lastRevealedId, (cardId) => {
  if (!cardId) return
  revealQueue.value.push(cardId)
})
```

### Forsøg 6: Database-notifikationstabel — TESTET, VIRKER IKKE
Dropper broadcast helt. Handler inserter i `reveal_notifications`-tabel. Spilleren lytter på INSERT-events via `postgres_changes`. Migration 007 kørt. Interrupt vises stadig ikke.

```js
// board.js setRevealed
await supabase.from('reveal_notifications').insert({ group_id: _groupId, card_id: cardId })

// board.js subscribeRealtime
.on('postgres_changes', { event: 'INSERT', table: 'reveal_notifications', filter: `group_id=eq.${groupId}` },
  async (payload) => {
    await loadBoard(groupId)
    lastRevealedId.value = payload.new.card_id
  })
```

**Ukendt** om fejlen er: (A) insert fejler pga. RLS, (B) INSERT-event når ikke frem, (C) `lastRevealedId` sættes men Vue-watch trigges ikke, eller (D) modal renderer ikke korrekt.

---

## CSS/Teleport-problem (overlay ikke fullscreen)

`RevealInterrupt.vue` brugte scoped CSS (`.interrupt-backdrop { position: fixed; inset: 0 }`) kombineret med `<Teleport to="body">`. Scoped CSS + Teleport kan have edge cases med specificity. **Fix:** Inlinede styles direkte på backdrop-elementet:

```html
<div style="position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;
            background:rgba(0,0,0,0.82);backdrop-filter:blur(6px);">
```

Dette er implementeret og bør virke når interrupt faktisk trigges.

---

## Nuværende kode-state

- `RevealInterrupt.vue`: `<Teleport to="body">` + inline `position:fixed` styles. Klar til rendering.
- `board.js`: Forsøg 6 (DB-notifikationer). `lastRevealedId = ref(null)` eksponeret fra store.
- `PlayView.vue`: `watch(() => board.lastRevealedId, ...)` → `revealQueue` → `interruptCard` computed → `<RevealInterrupt v-if="interruptCard">`.
- `supabase/migrations/007_reveal_notifications.sql`: Kørt.

---

## Næste skridt når vi vender tilbage

Vi ved IKKE hvor kæden bryder. Det kræver console-debugging for at finde ud af det. Tilføj midlertidigt disse logs og se hvad browserkonsollen siger (F12):

**1. Tjek om insert lykkes (HandlerView/board.js `setRevealed`):**
```js
const { error } = await supabase.from('reveal_notifications').insert({ group_id: _groupId, card_id: cardId })
console.log('reveal insert:', error ?? 'OK')
```

**2. Tjek om event modtages (board.js `subscribeRealtime`):**
```js
}, async (payload) => {
  console.log('reveal_notifications INSERT modtaget:', payload.new)
  await loadBoard(groupId)
  lastRevealedId.value = payload.new.card_id
})
```

**3. Tjek om Vue-watch trigges (PlayView.vue):**
```js
watch(() => board.lastRevealedId, (cardId) => {
  console.log('lastRevealedId watch:', cardId)
  // ...
})
```

Disse tre logs fortæller præcis om problemet er (A) RLS/insert, (B) Realtime-levering, (C) Vue-reaktivitet, eller (D) noget andet helt.
