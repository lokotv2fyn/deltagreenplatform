<template>
  <div class="fixed inset-0 flex items-start justify-center p-4 pt-16 z-50 overflow-y-auto"
       style="background: rgba(0,0,0,0.85);"
       @click.self="$emit('close')">
    <div class="w-full max-w-lg mb-8" style="background: #0d0d0d; border: 1px solid #2a2a2a;">

      <!-- Modal header -->
      <div class="px-6 py-4" style="border-bottom: 1px solid #1a1a1a;">
        <p class="text-xs font-mono tracking-[0.25em] uppercase mb-1" style="color: #506858;">
          {{ editMode ? 'Rediger fil' : 'Ny fil' }}
        </p>
        <h2 class="text-sm font-mono tracking-wide" style="color: #c4c4c4;">
          {{ editMode ? 'Rediger kort' : 'Opret kort' }}
        </h2>
      </div>

      <div class="px-6 py-5 space-y-5">

        <!-- Type-vælger -->
        <div v-if="!editMode">
          <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">Type</label>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="(def, key) in availableTypes" :key="key"
                    @click="selectType(key)"
                    class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1 transition-colors type-btn"
                    :style="form.type === key
                      ? 'border: 1px solid #888; color: #c4c4c4; background: #1a1a1a;'
                      : 'border: 1px solid #2a2a2a; color: #555; background: transparent;'">
              {{ def.label }}
            </button>
          </div>
        </div>
        <div v-else>
          <span class="text-xs font-mono tracking-[0.15em] uppercase" style="color: #506858;">
            {{ availableTypes[form.type]?.label ?? form.type }}
          </span>
        </div>

        <!-- Label -->
        <div>
          <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
            Titel / label
          </label>
          <input v-model="form.label" type="text" placeholder="Vises på kortets forside"
                 class="w-full font-mono text-sm px-3 py-2 focus:outline-none"
                 style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;" />
        </div>

        <!-- Dynamiske felter -->
        <template v-if="form.type">
          <div v-for="field in currentFields" :key="field.key" class="space-y-1.5">
            <label class="text-xs font-mono tracking-[0.15em] uppercase flex items-center gap-2" style="color: #506858;">
              {{ field.label }}
              <span v-if="field.required === false" style="color: #3a5040;">(valgfri)</span>
            </label>
            <p v-if="field.hint" class="text-xs font-mono" style="color: #2a2a2a;">{{ field.hint }}</p>

            <input v-if="field.type === 'text'"
                   v-model="fieldValues[field.key]"
                   type="text"
                   :placeholder="field.placeholder ?? ''"
                   class="w-full font-mono text-sm px-3 py-2 focus:outline-none"
                   style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;" />
            <textarea v-else-if="field.type === 'textarea'"
                      v-model="fieldValues[field.key]"
                      rows="3"
                      class="w-full font-mono text-sm px-3 py-2 focus:outline-none resize-y"
                      style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;" />
            <label v-else-if="field.type === 'checkbox'" class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="fieldValues[field.key]" class="accent-neutral-600" />
              <span class="text-sm font-mono" style="color: #888;">{{ field.label }}</span>
            </label>
          </div>
        </template>

        <!-- Reveal (handler only) -->
        <label v-if="!playerMode" class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="form.revealed" class="accent-neutral-600" />
          <span class="text-xs font-mono tracking-wider" style="color: #888;">Reveal til spillere</span>
        </label>
        <p v-else-if="!editMode" class="text-xs font-mono" style="color: #506858;">
          {{ autoRevealEnabled
            ? 'Kortet vises for alle med det samme (auto-reveal er slået til)'
            : 'Kortet skal godkendes af Handler før det vises for andre' }}
        </p>

        <p v-if="error" class="text-xs font-mono" style="color: #dc2626;">{{ error }}</p>
      </div>

      <div class="px-6 py-4 flex justify-end gap-4" style="border-top: 1px solid #1a1a1a;">
        <button @click="$emit('close')"
                class="text-xs font-mono tracking-[0.1em] uppercase transition-colors"
                style="color: #506858;">
          Annuller
        </button>
        <button @click="submit" :disabled="!canSubmit || saving"
                class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-2 transition-colors submit-btn disabled:opacity-30"
                style="border: 1px solid #4a7c59; color: #4a7c59;">
          {{ saving ? 'Gemmer…' : editMode ? 'Gem ændringer' : 'Opret kort' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../../config/cardTypes'
import { useBoardStore } from '../../stores/board'

const props = defineProps({
  groupId: { type: String, required: true },
  sessionId: { type: String, default: null },
  playerMode: { type: Boolean, default: false },
  autoRevealEnabled: { type: Boolean, default: false },
  card: { type: Object, default: null },
})
const emit = defineEmits(['close', 'created', 'updated'])

const board = useBoardStore()
const editMode = computed(() => !!props.card)
const availableTypes = computed(() => props.playerMode ? PLAYER_CARD_TYPES : CARD_TYPES)

const form = ref({
  type: props.card?.type ?? (props.playerMode ? 'bevis' : 'briefing'),
  label: props.card?.label ?? '',
  revealed: props.card?.revealed ?? false,
})

const fieldValues = ref(props.card?.data ? { ...props.card.data } : {})
const currentFields = computed(() => availableTypes.value[form.value.type]?.fields ?? [])

const canSubmit = computed(() =>
  form.value.type && form.value.label.trim() &&
  currentFields.value
    .filter(f => f.required !== false && f.type !== 'checkbox')
    .every(f => fieldValues.value[f.key]?.toString().trim())
)

const saving = ref(false)
const error = ref('')

function selectType(key) {
  form.value.type = key
  fieldValues.value = {}
}

watch(() => form.value.type, () => {
  if (!editMode.value) fieldValues.value = {}
})

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = ''

  const data = {}
  for (const field of currentFields.value) {
    const raw = fieldValues.value[field.key]
    if (raw === undefined || raw === '') continue
    data[field.key] = field.transform ? field.transform(raw) : raw
  }

  try {
    if (editMode.value) {
      await board.updateCard(props.card.id, { label: form.value.label.trim(), data, revealed: form.value.revealed })
      emit('updated')
      emit('close')
    } else {
      await board.createCard({
        groupId: props.groupId,
        sessionId: props.sessionId,
        type: form.value.type,
        label: form.value.label.trim(),
        data,
        origin: props.playerMode ? 'player' : 'handler',
        revealed: props.playerMode ? props.autoRevealEnabled : form.value.revealed,
      })
      emit('created')
      emit('close')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.type-btn:hover { border-color: #555; color: #c4c4c4; }
.submit-btn:hover { border-color: #86efac; color: #86efac; }
</style>
