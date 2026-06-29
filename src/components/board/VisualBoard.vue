<template>
  <div class="flex h-full w-full overflow-hidden">

    <!-- ─── CANVAS WRAPPER ──────────────────────────────────────────────── -->
    <div class="flex-1 relative overflow-hidden">

      <!-- Scrollable canvas container -->
      <div ref="containerEl"
           class="w-full h-full overflow-auto no-scrollbar relative"
           @mousemove="onMouseMove"
           @mouseup="onMouseUp"
           @mouseleave="onMouseUp"
           @click.self="selectedCard = null">

        <div style="width: 3000px; height: 2000px; position: relative;"
             class="canvas-bg"
             @click.self="selectedCard = null">

          <!-- SVG rød tråd + chain-drag preview -->
          <svg class="absolute inset-0 pointer-events-none"
               width="3000" height="2000" style="z-index: 0; overflow: visible;">
            <defs>
              <marker id="chain-tip" markerWidth="7" markerHeight="5"
                      refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#dc2626" opacity="0.85" />
              </marker>
              <marker id="chain-tip-preview" markerWidth="7" markerHeight="5"
                      refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#dc2626" opacity="0.5" />
              </marker>
            </defs>

            <!-- Eksisterende kæde-linjer -->
            <line v-for="(link, i) in board.chain.slice(0, -1)" :key="link.id"
                  :x1="center(link.card_id).x" :y1="center(link.card_id).y"
                  :x2="center(board.chain[i + 1].card_id).x" :y2="center(board.chain[i + 1].card_id).y"
                  stroke="#dc2626" stroke-width="1.5" opacity="0.75"
                  marker-end="url(#chain-tip)" />

            <!-- Chain-drag preview linje -->
            <line v-if="chainDragging"
                  :x1="center(chainDragging.fromCardId).x"
                  :y1="center(chainDragging.fromCardId).y"
                  :x2="chainDragTarget ? center(chainDragTarget).x : chainDragging.currentX"
                  :y2="chainDragTarget ? center(chainDragTarget).y : chainDragging.currentY"
                  stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5"
                  marker-end="url(#chain-tip-preview)" />
          </svg>

          <!-- Kort -->
          <div
            v-for="card in board.cards"
            :key="card.id"
            :ref="el => setCardRef(el, card.id)"
            class="absolute"
            :style="cardStyle(card)"
            @mousedown.stop="startDrag($event, card)"
            @mouseenter="hoveredCardId = card.id"
            @mouseleave="hoveredCardId = null">
            <VisualCard
              :card="card"
              :is-handler="isHandler"
              :can-edit="canEdit"
              :is-dragging="dragging?.cardId === card.id"
              :is-chain-target="chainDragTarget === card.id"
              @chain-drag-start="startChainDrag($event, card)"
            />
          </div>
        </div>
      </div>

      <!-- Opret-knap — udenfor scroll-area, aldrig bag sidebar -->
      <div class="absolute bottom-6 right-6 z-30">
        <button v-if="canEdit"
                @click="showCreate = true"
                class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-2 shadow-lg transition-colors create-btn"
                style="background: #0d0d0d; border: 1px solid #2a2a2a; color: #555;">
          {{ t('board.create') }}
        </button>
      </div>
    </div>

    <!-- ─── SIDEBAR ─────────────────────────────────────────────────── -->
    <Transition name="slide">
      <aside v-if="selectedCard"
             class="w-72 shrink-0 flex flex-col overflow-hidden"
             style="border-left: 1px solid #1a1a1a; background: #080808;">

        <!-- Header -->
        <div class="px-4 py-3 flex items-start gap-2" style="border-bottom: 1px solid #1a1a1a;">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-neutral-600 uppercase font-mono tracking-wide">
              {{ typeLabel(selectedCard) }}
            </p>
            <h2 class="text-sm font-medium text-neutral-200 leading-snug mt-0.5">
              {{ selectedCard.label }}
            </h2>
            <p v-if="!selectedCard.revealed" class="text-xs text-amber-700 mt-0.5">Ikke revealed</p>
          </div>
          <button @click="selectedCard = null"
                  class="text-neutral-600 hover:text-neutral-300 text-xl leading-none shrink-0 mt-0.5">×</button>
        </div>

        <!-- Felter -->
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
          <template v-for="field in sidebarFields" :key="field.key">
            <div v-if="fieldVal(field)" class="space-y-0.5">
              <p class="text-xs text-neutral-600 uppercase tracking-wide">{{ field.label }}</p>
              <p v-if="Array.isArray(fieldVal(field))" class="text-neutral-300">
                {{ fieldVal(field).join(', ') }}
              </p>
              <div v-else-if="field.key === 'lines'"
                   class="font-mono text-xs text-green-400 bg-black rounded p-2 space-y-0.5">
                <div v-for="(line, i) in fieldVal(field)" :key="i">{{ line }}</div>
              </div>
              <p v-else-if="field.type === 'checkbox'" class="text-neutral-300">
                {{ fieldVal(field) ? 'Ja' : 'Nej' }}
              </p>
              <p v-else-if="['body','notes','description','analysis','message'].includes(field.key)"
                 v-html="renderRedacted(fieldVal(field))"
                 class="text-neutral-300 whitespace-pre-wrap leading-relaxed" />
              <img v-else-if="field.key === 'imageUrl'"
                   :src="fieldVal(field)"
                   class="rounded max-h-48 w-full object-contain" />
              <p v-else class="text-neutral-300">{{ fieldVal(field) }}</p>
            </div>
          </template>
          <p v-if="!sidebarFields.length" class="text-neutral-700 text-xs">Ingen felter.</p>
        </div>

        <!-- Handlinger -->
        <div class="px-4 py-3 space-y-2" style="border-top: 1px solid #1a1a1a;">
          <!-- Rød tråd -->
          <button v-if="canEdit" @click="toggleChain(selectedCard)"
                  class="w-full text-left text-xs transition-colors"
                  :class="board.isInChain(selectedCard.id)
                    ? 'text-red-700 hover:text-red-500'
                    : 'text-neutral-600 hover:text-neutral-400'">
            {{ board.isInChain(selectedCard.id)
               ? `× Fjern fra rød tråd (pos. ${board.getChainPosition(selectedCard.id)})`
               : '# Tilføj til rød tråd' }}
          </button>

          <!-- Reveal (handler) -->
          <button v-if="isHandler" @click="board.setRevealed(selectedCard.id, !selectedCard.revealed)"
                  class="w-full text-left text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
            {{ selectedCard.revealed ? '○ Skjul for spillere' : '● Reveal for spillere' }}
          </button>

          <!-- Rediger / Slet -->
          <div v-if="canModify" class="flex gap-4 pt-1">
            <button @click="showEdit = true"
                    class="text-xs text-neutral-600 hover:text-neutral-300 transition-colors">
              Rediger
            </button>
            <button @click="deleteSelected"
                    class="text-xs text-neutral-700 hover:text-red-500 transition-colors">
              Slet
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Modaler -->
    <CreateCardModal
      v-if="showCreate"
      :group-id="groupId"
      :session-id="sessionId"
      :player-mode="!isHandler"
      :auto-reveal-enabled="autoRevealEnabled"
      @close="showCreate = false"
      @created="showCreate = false"
    />

    <CreateCardModal
      v-if="showEdit && selectedCard"
      :group-id="groupId"
      :session-id="selectedCard.session_id"
      :player-mode="!isHandler"
      :card="selectedCard"
      @close="showEdit = false"
      @updated="showEdit = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBoardStore } from '../../stores/board'
import { useAuthStore } from '../../stores/auth'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'
import { renderRedacted } from '../../lib/renderRedacted'
import VisualCard from './VisualCard.vue'
import CreateCardModal from './CreateCardModal.vue'

const props = defineProps({
  groupId:           { type: String,  required: true },
  sessionId:         { type: String,  default: null },
  isHandler:         { type: Boolean, default: false },
  canEdit:           { type: Boolean, default: false },
  autoRevealEnabled: { type: Boolean, default: false },
})

const { t } = useI18n()
const board = useBoardStore()
const auth  = useAuthStore()

const CANVAS_W = 3000
const CANVAS_H = 2000
const CARD_W   = 180
const CARD_H   = 56 // used only for drag clamping bounds

// ─── Card height tracking via ResizeObserver ──────────────────────────────

const cardHeights = ref({})
let ro = null

function ensureRO() {
  if (ro) return
  ro = new ResizeObserver(entries => {
    const next = { ...cardHeights.value }
    for (const e of entries) {
      const id = e.target.__cardId
      if (id) next[id] = Math.round(e.contentRect.height)
    }
    cardHeights.value = next
  })
}

function setCardRef(el, cardId) {
  if (!el) return
  ensureRO()
  el.__cardId = cardId
  ro.observe(el)
}

onUnmounted(() => ro?.disconnect())

// ─── Positioning ──────────────────────────────────────────────────────────

function autoPos(card) {
  const idx = board.cards.indexOf(card)
  return { x: 80 + (idx % 8) * 210, y: 80 + Math.floor(idx / 8) * 140 }
}

function resolvedPos(card) {
  if (dragging.value?.cardId === card.id) {
    return { x: dragging.value.currentX, y: dragging.value.currentY }
  }
  const pos = board.getPos(card)
  if (pos?.x != null && (pos.x !== 0 || pos.y !== 0)) return { x: pos.x, y: pos.y }
  return autoPos(card)
}

function center(cardId) {
  const card = board.cards.find(c => c.id === cardId)
  if (!card) return { x: 0, y: 0 }
  const { x, y } = resolvedPos(card)
  const h = cardHeights.value[cardId] ?? 52
  return { x: x + 90, y: y + h / 2 }
}

function cardStyle(card) {
  const { x, y } = resolvedPos(card)
  const draggingThis = dragging.value?.cardId === card.id
  const selected     = selectedCard.value?.id === card.id
  const chainTarget  = chainDragging.value && hoveredCardId.value === card.id && card.id !== chainDragging.value.fromCardId
  return {
    left:   `${x}px`,
    top:    `${y}px`,
    zIndex: draggingThis ? 100 : selected ? 10 : chainTarget ? 20 : 1,
    cursor: chainDragging.value
      ? (chainTarget ? 'copy' : 'crosshair')
      : props.canEdit ? (draggingThis ? 'grabbing' : 'grab') : 'default',
  }
}

// ─── Card drag ────────────────────────────────────────────────────────────

const containerEl = ref(null)
const dragging    = ref(null)

function canvasCoords(e) {
  const r = containerEl.value.getBoundingClientRect()
  return {
    x: e.clientX - r.left + containerEl.value.scrollLeft,
    y: e.clientY - r.top  + containerEl.value.scrollTop,
  }
}

function startDrag(e, card) {
  if (chainDragging.value) return
  if (!props.canEdit) {
    selectedCard.value = card
    return
  }
  const { x: mx, y: my } = canvasCoords(e)
  const { x, y } = resolvedPos(card)
  dragging.value = { cardId: card.id, offsetX: mx - x, offsetY: my - y, currentX: x, currentY: y, hasMoved: false }
}

function onMouseMove(e) {
  if (dragging.value) {
    const { x, y } = canvasCoords(e)
    dragging.value.currentX = Math.max(0, Math.min(CANVAS_W - CARD_W, x - dragging.value.offsetX))
    dragging.value.currentY = Math.max(0, Math.min(CANVAS_H - CARD_H, y - dragging.value.offsetY))
    dragging.value.hasMoved = true
  }
  if (chainDragging.value) {
    const { x, y } = canvasCoords(e)
    chainDragging.value.currentX = x
    chainDragging.value.currentY = y
  }
}

async function onMouseUp() {
  // Chain drag: connect on drop
  if (chainDragging.value) {
    const fromId = chainDragging.value.fromCardId
    const toId   = hoveredCardId.value
    chainDragging.value = null
    if (toId && toId !== fromId) {
      if (!board.isInChain(fromId)) await board.addToChain(fromId)
      if (!board.isInChain(toId))   await board.addToChain(toId)
    }
    return
  }

  if (!dragging.value) return
  const { cardId, currentX, currentY, hasMoved } = dragging.value
  dragging.value = null
  if (hasMoved) {
    await board.setPosition(cardId, currentX, currentY)
  } else {
    selectedCard.value = board.cards.find(c => c.id === cardId) ?? null
  }
}

// ─── Chain drag ───────────────────────────────────────────────────────────

const chainDragging  = ref(null) // { fromCardId, currentX, currentY }
const hoveredCardId  = ref(null)

// Valid hover target during chain drag (not the source card)
const chainDragTarget = computed(() =>
  chainDragging.value && hoveredCardId.value && hoveredCardId.value !== chainDragging.value.fromCardId
    ? hoveredCardId.value
    : null
)

function startChainDrag(e, card) {
  const { x, y } = canvasCoords(e)
  chainDragging.value = { fromCardId: card.id, currentX: x, currentY: y }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

const selectedCard = ref(null)
const showCreate   = ref(false)
const showEdit     = ref(false)

const canModify = computed(() =>
  selectedCard.value &&
  (props.isHandler || selectedCard.value.created_by === auth.user?.id)
)

const sidebarFields = computed(() => {
  if (!selectedCard.value) return []
  return CARD_TYPES[selectedCard.value.type]?.fields
      ?? PLAYER_CARD_TYPES[selectedCard.value.type]?.fields
      ?? []
})

function typeLabel(card) {
  return CARD_TYPES[card.type]?.label ?? PLAYER_CARD_TYPES[card.type]?.label ?? card.type
}

function fieldVal(field) {
  return selectedCard.value?.data?.[field.key]
}

async function toggleChain(card) {
  if (board.isInChain(card.id)) {
    await board.removeFromChain(card.id)
  } else {
    await board.addToChain(card.id)
  }
}

async function deleteSelected() {
  if (!selectedCard.value) return
  if (!confirm(`Slet "${selectedCard.value.label}"? Dette kan ikke fortrydes.`)) return
  const id = selectedCard.value.id
  selectedCard.value = null
  await board.deleteCard(id)
}
</script>

<style scoped>
.canvas-bg {
  background-color: #0b0b0b;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    url('/visual_view.png');
  background-size: 28px 28px, cover;
  background-attachment: fixed, fixed;
  background-repeat: repeat, no-repeat;
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.create-btn:hover { border-color: #555; color: #c4c4c4; }
.slide-enter-active,
.slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-enter-from,
.slide-leave-to { transform: translateX(100%); opacity: 0; }
</style>
