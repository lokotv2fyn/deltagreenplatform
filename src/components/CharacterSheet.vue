<template>
  <div class="space-y-8 max-w-2xl">

    <!-- Download-skabelon -->
    <div v-if="!readonly" class="flex items-center justify-between pb-2 border-b border-neutral-800">
      <p class="text-xs text-neutral-600">Udfyld arket herunder eller brug PDF-skabelonen</p>
      <a href="/character-sheet.pdf" download
         class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors dl-btn"
         style="border: 1px solid #1a1a1a; color: #3a3a3a;">
        ↓ Download PDF
      </a>
    </div>

    <!-- ─── AGENT INFO ──────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Agent</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="field-label">Navn</label>
          <input v-model="form.name" :disabled="readonly" class="sheet-input" placeholder="Agentens navn" />
        </div>
        <div>
          <label class="field-label">Alder</label>
          <input v-model="form.age" :disabled="readonly" class="sheet-input" placeholder="—" />
        </div>
        <div>
          <label class="field-label">Profession</label>
          <input v-model="form.profession" :disabled="readonly" class="sheet-input" placeholder="—" />
        </div>
        <div>
          <label class="field-label">Arbejdsgiver</label>
          <input v-model="form.employer" :disabled="readonly" class="sheet-input" placeholder="—" />
        </div>
        <div class="col-span-2">
          <label class="field-label">Nationalitet</label>
          <input v-model="form.nationality" :disabled="readonly" class="sheet-input" placeholder="—" />
        </div>
      </div>
    </section>

    <!-- ─── STATS ──────────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Stats</h3>
      <div class="grid grid-cols-6 gap-2 mb-4">
        <div v-for="stat in BASE_STATS" :key="stat.key" class="text-center">
          <label class="field-label text-center block">{{ stat.label }}</label>
          <input v-model.number="form.stats[stat.key]"
                 :disabled="readonly"
                 type="number" min="1" max="25"
                 class="sheet-input text-center font-mono text-base w-full" />
        </div>
      </div>

      <!-- Afledte stats -->
      <div class="grid grid-cols-4 gap-3">
        <div>
          <label class="field-label">HP <span class="text-neutral-800 normal-case font-normal">max {{ hpMax }}</span></label>
          <input v-model.number="form.hpCurrent" :disabled="readonly"
                 type="number" class="sheet-input text-center font-mono w-full"
                 :placeholder="String(hpMax)" />
        </div>
        <div>
          <label class="field-label">WP <span class="text-neutral-800 normal-case font-normal">max {{ form.stats.pow }}</span></label>
          <input v-model.number="form.wpCurrent" :disabled="readonly"
                 type="number" class="sheet-input text-center font-mono w-full"
                 :placeholder="String(form.stats.pow)" />
        </div>
        <div>
          <label class="field-label">SAN <span class="text-neutral-800 normal-case font-normal">start {{ sanStart }}</span></label>
          <input v-model.number="form.sanCurrent" :disabled="readonly"
                 type="number" class="sheet-input text-center font-mono w-full"
                 :placeholder="String(sanStart)" />
        </div>
        <div>
          <label class="field-label">Breaking Point</label>
          <p class="text-sm font-mono text-neutral-400 py-1.5 text-center">{{ breakingPoint }}</p>
        </div>
      </div>
    </section>

    <!-- ─── SKILLS ─────────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Skills</h3>
      <div class="grid grid-cols-2 gap-x-6 gap-y-0">
        <div v-for="skill in SKILLS" :key="skill.key"
             class="flex items-center gap-2 py-1 border-b border-neutral-900/80">
          <span class="text-xs text-neutral-400 flex-1 leading-tight">
            {{ skill.label }}
            <input v-if="skill.specify"
                   v-model="form.skills[`${skill.key}Specify`]"
                   :disabled="readonly"
                   class="bg-transparent border-b border-neutral-800 text-neutral-600 text-xs w-20 ml-1 focus:outline-none focus:border-neutral-500 disabled:cursor-default"
                   placeholder="spec." />
          </span>
          <span class="text-xs text-neutral-800 shrink-0 w-5 text-right tabular-nums">{{ skill.base }}</span>
          <input v-model.number="form.skills[skill.key]"
                 :disabled="readonly"
                 type="number" min="0" max="99"
                 class="w-12 bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-xs text-center font-mono text-neutral-200 focus:outline-none focus:border-neutral-600 disabled:opacity-60 disabled:cursor-default shrink-0" />
        </div>
      </div>
    </section>

    <!-- ─── BONDS ──────────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Bonds</h3>
      <div class="space-y-2">
        <div v-for="(bond, i) in form.bonds" :key="i" class="flex items-center gap-2">
          <input v-model="bond.name" :disabled="readonly"
                 class="sheet-input flex-1" placeholder="Navn / relation" />
          <input v-model.number="bond.score" :disabled="readonly"
                 type="number" min="0" max="10"
                 class="w-14 bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm text-center font-mono focus:outline-none focus:border-neutral-600 disabled:opacity-60 disabled:cursor-default shrink-0" />
          <button v-if="!readonly" @click="removeBond(i)"
                  class="text-neutral-700 hover:text-red-500 transition-colors shrink-0 px-1 text-sm">×</button>
        </div>
      </div>
      <button v-if="!readonly && form.bonds.length < 6"
              @click="addBond"
              class="mt-2 text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
        + Tilføj bond
      </button>
    </section>

    <!-- ─── NOTER ──────────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Udstyr / noter</h3>
      <textarea v-model="form.notes" :disabled="readonly"
                rows="4"
                class="sheet-input w-full resize-y"
                placeholder="Udstyr, baghistorie, noter til sessionerne…" />
    </section>

    <!-- ─── GEM ────────────────────────────────────────────────────── -->
    <div v-if="!readonly" class="flex items-center gap-4 pb-8">
      <button @click="save" :disabled="character.saving"
              class="text-xs font-mono tracking-[0.1em] uppercase px-5 py-2 transition-colors disabled:opacity-30 save-btn"
              style="border: 1px solid #4a7c59; color: #4a7c59;">
        {{ character.saving ? 'Gemmer…' : 'Gem karakterark' }}
      </button>
      <span v-if="savedAt" class="text-xs text-neutral-700">Gemt {{ savedAt }}</span>
      <span v-if="saveError" class="text-xs text-red-500">{{ saveError }}</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { SKILLS, defaultSkills } from '../config/skillsList'
import { useCharacterStore } from '../stores/character'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  groupId: { type: String, required: true },
  initialData: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
})

const character = useCharacterStore()
const auth = useAuthStore()

const BASE_STATS = [
  { key: 'str', label: 'STR' },
  { key: 'con', label: 'CON' },
  { key: 'dex', label: 'DEX' },
  { key: 'int', label: 'INT' },
  { key: 'pow', label: 'POW' },
  { key: 'cha', label: 'CHA' },
]

function buildForm(data) {
  return {
    name:        data?.name        ?? '',
    age:         data?.age         ?? '',
    profession:  data?.profession  ?? '',
    employer:    data?.employer    ?? '',
    nationality: data?.nationality ?? '',
    stats: {
      str: data?.stats?.str ?? 10,
      con: data?.stats?.con ?? 10,
      dex: data?.stats?.dex ?? 10,
      int: data?.stats?.int ?? 10,
      pow: data?.stats?.pow ?? 10,
      cha: data?.stats?.cha ?? 10,
    },
    hpCurrent:  data?.hpCurrent  ?? null,
    wpCurrent:  data?.wpCurrent  ?? null,
    sanCurrent: data?.sanCurrent ?? null,
    skills: { ...defaultSkills(), ...(data?.skills ?? {}) },
    bonds: data?.bonds?.length
      ? data.bonds.map(b => ({ ...b }))
      : [{ name: '', score: 4 }],
    notes: data?.notes ?? '',
  }
}

const form = ref(buildForm(props.initialData))

watch(() => props.initialData, (data) => {
  form.value = buildForm(data)
}, { deep: true })

const hpMax = computed(() =>
  Math.ceil((form.value.stats.str + form.value.stats.con) / 2)
)
const sanStart = computed(() => form.value.stats.pow * 5)
const breakingPoint = computed(() =>
  (form.value.sanCurrent ?? sanStart.value) - form.value.stats.pow
)

function addBond() {
  form.value.bonds.push({ name: '', score: 4 })
}
function removeBond(i) {
  form.value.bonds.splice(i, 1)
}

const savedAt = ref('')
const saveError = ref('')

async function save() {
  saveError.value = ''
  try {
    await character.saveMySheet(props.groupId, auth.user.id, form.value)
    savedAt.value = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    saveError.value = err.message
  }
}
</script>

<style scoped>
.section-heading {
  font-size: 0.65rem;
  font-family: monospace;
  color: #3a3a3a;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid #1a1a1a;
}
.field-label {
  font-size: 0.65rem;
  font-family: monospace;
  color: #3a3a3a;
  display: block;
  margin-bottom: 0.25rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.sheet-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #1a1a1a;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-family: monospace;
  color: #c4c4c4;
  outline: none;
}
.sheet-input:focus { border-color: #2a2a2a; }
.sheet-input:disabled { opacity: 0.5; cursor: default; }
.save-btn:hover { border-color: #86efac; color: #86efac; }
.dl-btn:hover { border-color: #2a2a2a; color: #888; }
</style>
