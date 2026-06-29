<template>
  <div class="group rounded border shadow-md select-none relative"
       :class="[typeStyle, isDragging ? 'shadow-2xl ring-1 ring-neutral-500' : 'hover:shadow-xl hover:border-opacity-80']"
       :style="isChainTarget ? 'box-shadow: 0 0 0 2px #dc2626; border-color: #dc2626;' : ''"
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

    <!-- Chain drag handle — appears on hover when editing is allowed -->
    <div v-if="canEdit"
         class="absolute top-0 right-0 w-5 h-5 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity z-10"
         style="cursor: crosshair; color: #dc2626; top: -8px; right: -8px;
                background: #0d0d0d; border: 1px solid #dc262640; border-radius: 2px;"
         @mousedown.stop.prevent="$emit('chain-drag-start', $event)"
         title="Træk for at forbinde med rød tråd">
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="2" cy="5" r="1.5" fill="#dc2626"/>
        <line x1="3.5" y1="5" x2="6.5" y2="5" stroke="#dc2626" stroke-width="1"/>
        <circle cx="8" cy="5" r="1.5" fill="#dc2626"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'
import { useBoardStore } from '../../stores/board'

const props = defineProps({
  card:         { type: Object,  required: true },
  isHandler:    { type: Boolean, default: false },
  isDragging:   { type: Boolean, default: false },
  canEdit:      { type: Boolean, default: false },
  isChainTarget:{ type: Boolean, default: false },
})

defineEmits(['chain-drag-start'])

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
