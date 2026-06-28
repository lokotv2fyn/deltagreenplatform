<template>
  <section class="mb-8">
    <div class="flex items-center gap-3 mb-3">
      <p class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #506858;">Rød tråd</p>
      <span class="text-xs font-mono" style="color: #2a2a2a;">{{ board.chain.length }}</span>
      <button v-if="isHandler" @click="toggleVisibility"
              class="ml-auto text-xs font-mono tracking-wider transition-colors visibility-btn"
              style="color: #506858;">
        {{ board.chainVisible ? 'Skjul for spillere' : 'Vis for spillere' }}
      </button>
    </div>

    <div v-if="!board.chainVisible && !isHandler"
         class="text-xs font-mono italic" style="color: #2a2a2a;">
      Den røde tråd er skjult af Handler.
    </div>

    <div v-else-if="!board.chain.length"
         class="text-xs font-mono" style="color: #2a2a2a;">
      Ingen kort i tråden endnu.
    </div>

    <div v-else class="space-y-px">
      <div v-for="(link, idx) in board.chain" :key="link.id"
           class="flex items-center gap-3 px-3 py-2"
           style="background: #0d0d0d; border: 1px solid #1a1a1a;">

        <span class="text-xs font-mono w-5 text-right shrink-0 tabular-nums" style="color: #dc2626;">
          {{ link.position }}
        </span>
        <span class="text-xs font-mono tracking-[0.1em] uppercase shrink-0" style="color: #506858;">
          {{ typeLabel(link.card?.type) }}
        </span>
        <span class="text-sm font-mono flex-1 truncate" style="color: #c4c4c4;">{{ link.card?.label }}</span>

        <template v-if="canEdit">
          <button @click="move(link.card_id, 'up')" :disabled="idx === 0"
                  class="text-xs font-mono px-0.5 transition-colors chain-nav disabled:opacity-20"
                  style="color: #506858;" title="Flyt op">↑</button>
          <button @click="move(link.card_id, 'down')" :disabled="idx === board.chain.length - 1"
                  class="text-xs font-mono px-0.5 transition-colors chain-nav disabled:opacity-20"
                  style="color: #506858;" title="Flyt ned">↓</button>
          <button @click="remove(link.card_id)"
                  class="text-xs font-mono pl-1 transition-colors chain-remove"
                  style="color: #506858;" title="Fjern fra tråd">×</button>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useBoardStore } from '../../stores/board'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'

const props = defineProps({
  isHandler: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
})

const board = useBoardStore()

function typeLabel(type) {
  return CARD_TYPES[type]?.label ?? PLAYER_CARD_TYPES[type]?.label ?? type
}

async function move(cardId, direction) {
  await board.moveChainItem(cardId, direction)
}

async function remove(cardId) {
  await board.removeFromChain(cardId)
}

async function toggleVisibility() {
  await board.setChainVisible(!board.chainVisible)
}
</script>

<style scoped>
.visibility-btn:hover { color: #888; }
.chain-nav:hover { color: #888; }
.chain-remove:hover { color: #dc2626; }
</style>
