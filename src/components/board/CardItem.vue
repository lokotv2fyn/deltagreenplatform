<template>
  <div class="text-sm transition-colors card-item"
       :style="[
         card.revealed
           ? 'border: 1px solid #1a1a1a; background: #0d0d0d;'
           : 'border: 1px solid #2a1a00; background: #0d0900;',
         isExpanded ? '' : 'cursor: pointer;'
       ]">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2" @click="isExpanded = !isExpanded">
      <span class="text-xs font-mono tracking-[0.15em] uppercase shrink-0" style="color: #506858;">
        {{ resolvedTypeLabel }}
      </span>
      <span class="font-mono text-sm flex-1 truncate" style="color: #c4c4c4;">{{ card.label }}</span>

      <span v-if="!card.revealed" class="text-xs font-mono tracking-wider shrink-0" style="color: #92400e;">
        {{ t('card.spoiler') }}
      </span>

      <!-- Red thread -->
      <button v-if="canEditChain && inChain" @click.stop="toggleChain"
              :title="t('card.remove_chain', { pos: chainPos })"
              class="shrink-0 text-xs font-mono p-0.5 transition-colors chain-active">
        {{ chainPos }}
      </button>
      <button v-else-if="canEditChain" @click.stop="toggleChain"
              :title="t('card.add_chain')"
              class="shrink-0 text-xs font-mono p-0.5 transition-colors chain-inactive">
        #
      </button>

      <!-- Reveal toggle (handler) -->
      <button v-if="isHandler" @click.stop="toggleReveal"
              :title="card.revealed ? t('card.reveal_hide') : t('card.reveal_show')"
              class="shrink-0 p-0.5 transition-colors icon-btn">
        <svg v-if="card.revealed" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
        </svg>
      </button>

      <!-- Expand chevron -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 transition-transform"
           :class="isExpanded ? 'rotate-180' : ''"
           style="color: #2a2a2a;"
           viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </div>

    <!-- Expanded content -->
    <div v-if="isExpanded" class="px-3 pb-3 pt-1 space-y-2" style="border-top: 1px solid #1a1a1a;">
      <template v-for="field in visibleFields" :key="field.key">
        <div v-if="getValue(field)" class="space-y-0.5">
          <p class="text-xs font-mono tracking-[0.15em] uppercase" style="color: #506858;">
            {{ resolvedFieldLabel(field) }}
          </p>
          <p v-if="Array.isArray(getValue(field))" class="text-sm font-mono" style="color: #888;">
            {{ getValue(field).join(', ') }}
          </p>
          <div v-else-if="field.key === 'lines'"
               class="font-mono text-xs p-2 space-y-0.5"
               style="background: #000; color: #4ade80;">
            <div v-for="(line, i) in getValue(field)" :key="i">{{ line }}</div>
            <span v-if="card.data.showCursor" class="animate-pulse">█</span>
          </div>
          <p v-else-if="field.type === 'checkbox'" class="text-sm font-mono" style="color: #888;">
            {{ getValue(field) ? t('card.yes') : t('card.no') }}
          </p>
          <p v-else-if="['body','notes','description','analysis','message'].includes(field.key)"
             v-html="renderRedacted(getValue(field))"
             class="text-sm font-mono whitespace-pre-wrap leading-relaxed" style="color: #888;" />
          <img v-else-if="field.key === 'imageUrl'"
               :src="getValue(field)"
               class="max-h-64 object-contain"
               loading="lazy" />
          <p v-else class="text-sm font-mono" style="color: #888;">{{ getValue(field) }}</p>
        </div>
      </template>

      <div v-if="canModify" class="flex gap-4 pt-2" style="border-top: 1px solid #1a1a1a;">
        <button @click.stop="showEdit = true"
                class="text-xs font-mono transition-colors action-btn-text" style="color: #506858;">
          {{ t('card.edit') }}
        </button>
        <button @click.stop="confirmDelete"
                class="text-xs font-mono transition-colors delete-btn" style="color: #506858;">
          {{ t('card.delete') }}
        </button>
      </div>
    </div>
  </div>

  <CreateCardModal
    v-if="showEdit"
    :group-id="card.group_id"
    :session-id="card.session_id"
    :player-mode="!isHandler"
    :card="card"
    @close="showEdit = false"
    @updated="showEdit = false"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'
import { renderRedacted } from '../../lib/renderRedacted'
import { useBoardStore } from '../../stores/board'
import { useAuthStore } from '../../stores/auth'
import CreateCardModal from './CreateCardModal.vue'

const { t, locale } = useI18n()

const props = defineProps({
  card: { type: Object, required: true },
  isHandler: { type: Boolean, default: false },
  canEditChain: { type: Boolean, default: false },
})

const board = useBoardStore()
const auth = useAuthStore()
const isExpanded = ref(false)
const showEdit = ref(false)

const typeDef = computed(() => CARD_TYPES[props.card.type] ?? PLAYER_CARD_TYPES[props.card.type])
const visibleFields = computed(() => typeDef.value?.fields ?? [])
const inChain = computed(() => board.isInChain(props.card.id))
const chainPos = computed(() => board.getChainPosition(props.card.id))
const canModify = computed(() => props.isHandler || props.card.created_by === auth.user?.id)

const resolvedTypeLabel = computed(() => {
  const def = typeDef.value
  if (!def) return props.card.type
  return locale.value === 'en' && def.labelEn ? def.labelEn : def.label
})

function resolvedFieldLabel(field) {
  return locale.value === 'en' && field.labelEn ? field.labelEn : field.label
}

function getValue(field) {
  return props.card.data?.[field.key]
}

async function toggleReveal() {
  await board.setRevealed(props.card.id, !props.card.revealed)
}

async function toggleChain() {
  if (inChain.value) {
    await board.removeFromChain(props.card.id)
  } else {
    await board.addToChain(props.card.id)
  }
}

async function confirmDelete() {
  if (!confirm(t('card.delete_confirm', { label: props.card.label }))) return
  await board.deleteCard(props.card.id)
}
</script>

<style scoped>
.card-item:hover { border-color: #2a2a2a !important; }
.icon-btn { color: #2a2a2a; }
.icon-btn:hover { color: #888; }
.chain-active { color: #dc2626; }
.chain-active:hover { color: #ef4444; }
.chain-inactive { color: #2a2a2a; }
.chain-inactive:hover { color: #888; }
.action-btn-text:hover { color: #888; }
.delete-btn:hover { color: #dc2626; }
</style>
