# Reveal Interrupt — Problem & Attempts

## What we want to achieve

When the handler reveals a card (sets `revealed = true`), the player should be interrupted regardless of which tab they are on. An overlay covers the entire screen — either a dramatic "new evidence" modal or a retro SMS style for `comms` cards. The player closes it actively (no auto-dismiss).

---

## Symptoms

1. **Interrupt is never shown** — the player sees nothing when the handler reveals.
2. **Card appears on canvas** — after getting realtime to work (migration 006), the player sees the card appear on the visual board, but no interrupt.
3. **Overlay not fullscreen** — when the interrupt did show (in early tests), it did not cover the full screen. Correction: the interrupt has never actually appeared.

---

## Relevant files

| File | Role |
|------|------|
| `src/components/RevealInterrupt.vue` | Overlay component. SMS variant + generic variant. |
| `src/stores/board.js` | Pinia store. `setRevealed()`, `subscribeRealtime()`, `lastRevealedId`. |
| `src/views/play/PlayView.vue` | Player view. Watcher on `board.lastRevealedId`, `revealQueue`, `interruptCard`. |
| `supabase/migrations/006_realtime_publication.sql` | Adds tables to the Supabase Realtime publication (critical fix). |
| `supabase/migrations/007_reveal_notifications.sql` | New notification table as event-bus for reveals (latest attempt, tested and also failed). |

---

## Root causes identified

### 1. Tables not in Supabase Realtime publication (resolved)
No `ALTER PUBLICATION supabase_realtime ADD TABLE ...` in the migrations. Without this, `postgres_changes` never sends any events at all. **Fix:** Migration 006. After this, realtime sync works (new cards appear live).

### 2. RLS blocks postgres_changes UPDATE events for players
When the handler changes `revealed` from `false` → `true` on a card the player was not allowed to see (because `revealed = false`), Supabase Realtime may not send the UPDATE event to the player. The player's SELECT policy sees cards with `revealed = true OR created_by = auth.uid()` — but the event for the change itself is sent based on the row's *previous* state (which was invisible). This is the likely root cause for the interrupt never being triggered.

### 3. Broadcast unreliable on mixed channels
Supabase Realtime Broadcast does not deliver consistently to channels that also have `postgres_changes` configured. We have not been able to confirm that broadcasts reach the player at all.

---

## Attempts (chronological)

### Attempt 1: Detection via Realtime UPDATE event in board store
Listened to `event: 'UPDATE'` in `subscribeRealtime`. Checked `payload.new.revealed === true` and whether the card was not visible before. Problem: the player may never receive the UPDATE event due to RLS (see root cause 2).

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

### Attempt 2: Watch on board.cards in PlayView
Watched `board.cards` reactively from PlayView. Detected new cards with `revealed: true` that were not in `seenRevealedIds`. Problem: the `watch` either never triggered (Vue reactivity timing) or triggered too early (before the `watchActive` flag was set).

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

### Attempt 3: Supabase Broadcast on a dedicated channel (`reveals:groupId`)
Handler sends a broadcast; player listens. Problem: name mismatch between what the handler sent on and what the player listened on. Additionally: the channel may not have been in SUBSCRIBED state when `send()` was called.

```js
// board.js setRevealed
revealChannel.send({ type: 'broadcast', event: 'card-revealed', payload: { cardId } })

// PlayView.vue
supabase.channel(`reveals:${groupId}`)
  .on('broadcast', { event: 'card-revealed' }, ({ payload }) => { ... })
  .subscribe()
```

### Attempt 4: Broadcast on `board:groupId` (two instances, same name)
Handler sends on the main board channel; the player's PlayView listens via a new instance with the same name. Problem: supabase-js cannot reliably handle two channel instances with identical names from the same client — broadcasts may end up in the wrong instance.

### Attempt 5: Broadcast listener in board store's channel + `lastRevealedId` ref
Move the broadcast listener into the board store channel's `.on()` chain (the same object that sends). Expose `lastRevealedId` as a reactive ref. PlayView watches it. Problem: broadcast still does not deliver consistently — we cannot confirm that the player receives it.

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

### Attempt 6: Database notification table — TESTED, DOES NOT WORK
Drop broadcast entirely. Handler inserts into a `reveal_notifications` table. Player listens for INSERT events via `postgres_changes`. Migration 007 has been run. Interrupt still does not appear.

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

**Unknown** whether the failure is: (A) insert fails due to RLS, (B) INSERT event never arrives, (C) `lastRevealedId` is set but the Vue watch does not trigger, or (D) the modal does not render correctly.

---

## CSS / Teleport problem (overlay not fullscreen)

`RevealInterrupt.vue` used scoped CSS (`.interrupt-backdrop { position: fixed; inset: 0 }`) combined with `<Teleport to="body">`. Scoped CSS + Teleport can have edge cases with specificity. **Fix:** Inlined styles directly on the backdrop element:

```html
<div style="position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;
            background:rgba(0,0,0,0.82);backdrop-filter:blur(6px);">
```

This is implemented and should work once the interrupt is actually triggered.

---

## Current code state

- `RevealInterrupt.vue`: `<Teleport to="body">` + inline `position:fixed` styles. Ready to render.
- `board.js`: Attempt 6 (DB notifications). `lastRevealedId = ref(null)` exposed from the store.
- `PlayView.vue`: `watch(() => board.lastRevealedId, ...)` → `revealQueue` → `interruptCard` computed → `<RevealInterrupt v-if="interruptCard">`.
- `supabase/migrations/007_reveal_notifications.sql`: Run.

---

## Next steps when we return

We do NOT know where the chain breaks. It requires console debugging to find out. Add these logs temporarily and check the browser console (F12):

**1. Check if the insert succeeds (HandlerView / board.js `setRevealed`):**
```js
const { error } = await supabase.from('reveal_notifications').insert({ group_id: _groupId, card_id: cardId })
console.log('reveal insert:', error ?? 'OK')
```

**2. Check if the event is received (board.js `subscribeRealtime`):**
```js
}, async (payload) => {
  console.log('reveal_notifications INSERT received:', payload.new)
  await loadBoard(groupId)
  lastRevealedId.value = payload.new.card_id
})
```

**3. Check if the Vue watch fires (PlayView.vue):**
```js
watch(() => board.lastRevealedId, (cardId) => {
  console.log('lastRevealedId watch:', cardId)
  // ...
})
```

These three logs pinpoint exactly whether the problem is (A) RLS/insert, (B) Realtime delivery, (C) Vue reactivity, or (D) something else entirely.
