<template>
  <div class="text-sm"
       :style="card.revealed
         ? 'border: 1px solid #1a1a1a; background: #0d0d0d;'
         : 'border: 1px solid #2a1a00; background: #0d0900;'">

    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
         @click="expanded = !expanded">

      <span class="text-xs font-mono tracking-[0.15em] uppercase shrink-0" style="color: #506858;">
        {{ typeLabel }}
      </span>
      <span class="font-mono flex-1 truncate" style="color: #c4c4c4;">{{ card.label }}</span>

      <span v-if="!card.revealed" class="text-xs font-mono tracking-wider shrink-0" style="color: #92400e;">
        SPOILER
      </span>

      <span v-if="chainPos" class="shrink-0 text-xs font-mono px-0.5" style="color: #dc2626;">
        {{ chainPos }}
      </span>

      <!-- Reveal icon — visible but disabled in demo -->
      <span class="shrink-0 p-0.5 opacity-20 cursor-default" title="Actions disabled in demo mode">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path v-if="card.revealed" d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path v-if="card.revealed" fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
          <path v-if="!card.revealed" fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
          <path v-if="!card.revealed" d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
        </svg>
      </span>

      <svg class="w-4 h-4 shrink-0 transition-transform"
           :class="expanded ? 'rotate-180' : ''"
           style="color: #2a2a2a;"
           xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </div>

    <!-- Expanded fields -->
    <div v-if="expanded" class="px-3 pb-3 pt-1 space-y-2" style="border-top: 1px solid #1a1a1a;">
      <template v-for="field in visibleFields" :key="field.key">
        <div v-if="getValue(field)" class="space-y-0.5">
          <p class="text-xs font-mono tracking-[0.15em] uppercase" style="color: #506858;">
            {{ fieldLabel(field) }}
          </p>
          <p v-if="Array.isArray(getValue(field))" class="text-sm font-mono" style="color: #888;">
            {{ getValue(field).join(', ') }}
          </p>
          <div v-else-if="field.key === 'lines'"
               class="font-mono text-xs p-2 space-y-0.5"
               style="background: #000; color: #4ade80;">
            <div v-for="(line, i) in getValue(field)" :key="i">{{ line }}</div>
          </div>
          <p v-else-if="['body','notes','description','analysis','message'].includes(field.key)"
             v-html="renderRedacted(getValue(field))"
             class="text-sm font-mono whitespace-pre-wrap leading-relaxed" style="color: #888;" />
          <p v-else class="text-sm font-mono" style="color: #888;">{{ getValue(field) }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'
import { renderRedacted } from '../../lib/renderRedacted'

const { locale } = useI18n()

const props = defineProps({
  card: { type: Object, required: true },
  chainPos: { type: Number, default: null },
})

const expanded = ref(false)

const typeDef = computed(() => CARD_TYPES[props.card.type] ?? PLAYER_CARD_TYPES[props.card.type])
const visibleFields = computed(() => typeDef.value?.fields ?? [])

const typeLabel = computed(() => {
  const def = typeDef.value
  if (!def) return props.card.type
  return locale.value === 'en' && def.labelEn ? def.labelEn : def.label
})

function fieldLabel(field) {
  return locale.value === 'en' && field.labelEn ? field.labelEn : field.label
}

function getValue(field) {
  return props.card.data?.[field.key]
}
</script>
