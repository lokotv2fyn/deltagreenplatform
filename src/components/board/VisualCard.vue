<template>
  <div class="rounded border shadow-md select-none"
       :class="[typeStyle, isDragging ? 'shadow-2xl ring-1 ring-neutral-500' : 'hover:shadow-xl hover:border-opacity-80']"
       style="width: 180px;">

    <!-- Type + chain pos + spoiler dot -->
    <div class="flex items-center justify-between gap-1 px-2 pt-1.5 pb-0.5">
      <span class="text-xs text-neutral-500 uppercase font-mono tracking-wide truncate leading-none">
        {{ typeLabel }}
      </span>
      <div class="flex items-center gap-1.5 shrink-0">
        <span v-if="chainPosition" class="text-xs font-mono text-red-700 font-bold leading-none">
          #{{ chainPosition }}
        </span>
        <span v-if="!card.revealed && isHandler"
              class="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
      </div>
    </div>

    <!-- Billede -->
    <img v-if="imageUrl" :src="imageUrl"
         class="w-full h-20 object-cover"
         loading="lazy" draggable="false" />

    <!-- Label -->
    <p class="px-2 py-1.5 text-sm font-medium text-neutral-200 leading-tight line-clamp-2">
      {{ card.label }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'
import { useBoardStore } from '../../stores/board'

const props = defineProps({
  card:      { type: Object,  required: true },
  isHandler: { type: Boolean, default: false },
  isDragging:{ type: Boolean, default: false },
})

const board = useBoardStore()

const typeDef      = computed(() => CARD_TYPES[props.card.type] ?? PLAYER_CARD_TYPES[props.card.type])
const typeLabel    = computed(() => typeDef.value?.label ?? props.card.type)
const imageUrl     = computed(() => props.card.data?.imageUrl ?? null)
const chainPosition= computed(() => board.getChainPosition(props.card.id))

const TYPE_STYLES = {
  briefing:  'border-neutral-700  bg-neutral-900',
  handout:   'border-amber-800/70 bg-amber-950',
  npc:       'border-blue-800/70  bg-blue-950',
  bevis:     'border-green-800/70 bg-green-950',
  unnatural: 'border-purple-800/70 bg-purple-950',
  terminal:  'border-green-700/70 bg-black',
  comms:     'border-cyan-800/70  bg-cyan-950',
}

const typeStyle = computed(() => TYPE_STYLES[props.card.type] ?? 'border-neutral-700 bg-neutral-900')
</script>
