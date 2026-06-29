# Red Thread Line Positioning Bug

## Symptom

SVG chain lines connecting cards on the visual board do not hit the visual center (or bottom) of the cards. Consistently, exactly ONE card appears correctly anchored while the others are off. Which card is "correct" shifts when the code changes, suggesting the correct card wins by coincidence — its actual rendered height happens to match whatever constant we use. After recent tries its now the first card that has the line correct at the bottom.

Before the chain drag-and-drop feature was added, the line positions were reportedly perfect. The bug was introduced during that implementation.

## Architecture

- Cards are `position: absolute` inside a `3000×2000` canvas div (`position: relative`)
- SVG lines are also `absolute inset-0` inside the same canvas div — same coordinate origin, 1:1 pixel scale, no viewBox
- Card positions come from `card_positions` table (x, y = top-left corner), or fall back to `autoPos()` (grid layout)
- `center(cardId)` is called from the SVG template to get line endpoints

The coordinate system itself has been verified correct by multiple agents: SVG and cards share the same origin, no CSS transforms, no scaling.

## Root Cause (suspected but unconfirmed)

Card heights vary:
- Single-line card (no image): ~52px → center at y+26
- Two-line label card: ~70px → center at y+35
- Card with image (h-20): ~132px → center at y+66

Any fixed constant hits the correct center for exactly one card height. The card whose actual height matches the constant looks correct; others are off.

Dynamic DOM measurement was attempted multiple times but failed (see below).

## Attempts (all failed)

### Attempt 1 — Non-reactive Map
```js
const cardHeights = new Map()
function setCardRef(el, cardId) {
  if (el?.$el) cardHeights.set(cardId, el.$el.offsetHeight)
}
```
Used plain `Map` (not reactive). Vue didn't recompute SVG lines after refs were set.
Result: second card correct by coincidence, first and third off.

### Attempt 2 — `ref({})` reactive map via ref callbacks
```js
const cardHeights = ref({})
function setCardRef(el, cardId) {
  const domEl = el?.$el ?? el
  if (domEl?.offsetHeight) cardHeights.value[cardId] = domEl.offsetHeight
}
```
`el.$el` is undefined on `<script setup>` components without `defineExpose`. Always used fallback height.

### Attempt 3 — `defineExpose({ el: rootEl })` in VisualCard
Added `ref="rootEl"` and `defineExpose({ el: rootEl })` to VisualCard.
VisualBoard read `el.el.value.offsetHeight` in the ref callback.
Still failed — timing or ref-chain ambiguity in Vue 3's callback context.

### Attempt 4 — Fixed anchor `y + 22`
Dropped DOM measurement. Used fixed offset of 22px (mid-point of type-label row).
Works for one specific card height only.

### Attempt 5 — `onMounted` emit from VisualCard
```js
// VisualCard
onMounted(() => emit('card-height', rootEl.value.offsetHeight))
onUpdated(() => emit('card-height', rootEl.value.offsetHeight))

// VisualBoard
@card-height="h => cardHeights[card.id] = h"
```
All four agents in a multi-agent debug workflow concluded:
- Vue batches all `onMounted` hooks before re-rendering the parent, so timing is NOT the issue
- IDs match correctly, coordinate system is correct
- Most likely: `reactive({})` loses dependency tracking for dynamically added keys under certain flush sequences

### Attempt 6 — `ref({})` + immutable spread + `computed(centerMap)`
```js
const cardHeights = ref({})
@card-height="h => cardHeights.value = { ...cardHeights.value, [card.id]: h }"

const centerMap = computed(() =>
  Object.fromEntries(board.cards.map(card => {
    const h = cardHeights.value[card.id] ?? CARD_H
    return [card.id, { x: x + 90, y: y + h / 2 }]
  }))
)
```
Immutable spread guarantees Vue detects the ref change. Computed wrapper ensures re-evaluation.
Still failed — user reports cards 2 and 3 still off.

### Attempt 7 — Data-based height estimation
```js
function cardContentHeight(card) {
  const hasImage = !!card.data?.imageUrl
  const twoLines = (card.label ?? '').length > 22
  return 20 + (twoLines ? 48 : 30) + (hasImage ? 80 : 0) + 2
}
```
User reports it looks like height accumulates per card — behavior unclear, possibly unrelated bug exposed.

### Attempt 8 — Fixed bottom-center `y + 52`
```js
function center(cardId) {
  const card = board.cards.find(c => c.id === cardId)
  if (!card) return { x: 0, y: 0 }
  const { x, y } = resolvedPos(card)
  return { x: x + 90, y: y + 52 }
}
```
Still off. User gave up at this point.

## What to try next

1. **Add visible debug dots to the SVG** — render `<circle>` at each computed `center()` position and compare visually to actual card positions. This will immediately show whether the issue is in `center()` math or in something else entirely.

```html
<circle v-for="card in board.cards" :key="card.id"
        :cx="center(card.id).x" :cy="center(card.id).y"
        r="4" fill="yellow" />
```

2. **Check if `resolvedPos` returns different values for SVG vs cards** — add `console.log` to `center()` and `cardStyle()` and compare the x,y values for the same card.

3. **Check if the issue is X, not Y** — the debugging so far assumed Y was wrong (height). But if X is wrong, that's a completely different problem. The debug circles above would reveal this.

4. **Check `card_positions` data** — open browser devtools, log `board.cards` and inspect each card's `card_positions` array. Confirm that the x,y values in the store match where the cards appear visually on screen.

5. **Try `getBoundingClientRect` approach** — instead of stored positions, measure the actual screen position of each card relative to the canvas, and use those as SVG coordinates. Requires keeping DOM refs to card elements.

## Current state of the code

`center()` in `VisualBoard.vue` currently uses `{ x: x + 90, y: y + 52 }` — the simplest possible fixed offset. This is wrong but at least not complex.
