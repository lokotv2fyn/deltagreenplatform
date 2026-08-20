<template>
  <div class="space-y-8 max-w-4xl">

    <!-- Download-skabelon -->
    <div v-if="!readonly" class="flex items-center justify-between pb-2 border-b border-neutral-800">
      <p class="text-xs text-neutral-400">Udfyld arket herunder eller brug PDF-skabelonen</p>
      <a href="/character-sheet.pdf" download
         class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors dl-btn"
         style="border: 1px solid #1a1a1a; color: #6b8578;">
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
      <div class="grid grid-cols-6 gap-2 mb-2">
        <div v-for="stat in BASE_STATS" :key="stat.key" class="text-center">
          <label class="field-label text-center block">{{ stat.label }}</label>
          <input v-model.number="form.stats[stat.key]"
                 :disabled="readonly"
                 type="number" min="1" max="25"
                 class="sheet-input text-center font-mono text-base w-full" />
          <span class="text-xs text-neutral-400 font-mono">×5: {{ (form.stats[stat.key] || 0) * 5 }}%</span>
        </div>
      </div>

      <div class="text-xs font-mono mb-4"
           :class="statsTotal > statPointCap ? 'text-red-500' : 'text-neutral-400'">
        Total: {{ statsTotal }} / {{ statPointCap }}
      </div>

      <!-- Afledte stats -->
      <div class="grid grid-cols-4 gap-3">
        <div>
          <label class="field-label">HP <span class="text-neutral-400 normal-case font-normal">max {{ hpMax }}</span></label>
          <input v-model.number="form.hpCurrent" :disabled="readonly"
                 type="number" class="sheet-input text-center font-mono w-full"
                 :placeholder="String(hpMax)" />
        </div>
        <div>
          <label class="field-label">WP <span class="text-neutral-400 normal-case font-normal">max {{ form.stats.pow }}</span></label>
          <input v-model.number="form.wpCurrent" :disabled="readonly"
                 type="number" class="sheet-input text-center font-mono w-full"
                 :placeholder="String(form.stats.pow)" />
        </div>
        <div>
          <label class="field-label" title="Starting SAN (POW×5); max SAN drops as Unnatural rises">
            SAN <span class="text-neutral-400 normal-case font-normal">{{ sanStart }}/{{ sanMax }}</span>
          </label>
          <input v-model.number="form.sanCurrent" :disabled="readonly"
                 type="number" class="sheet-input text-center font-mono w-full"
                 :placeholder="String(sanStart)" />
        </div>
        <div>
          <label class="field-label" title="Breaking Point">BP</label>
          <div class="flex gap-1">
            <input v-model.number="form.bpCurrent" :disabled="readonly"
                   type="number" class="sheet-input text-center font-mono w-full" />
            <button v-if="!readonly" @click="calculateBP" type="button"
                    title="Calculate: current SAN − POW"
                    class="shrink-0 px-2 text-xs font-mono transition-colors bp-calc-btn"
                    style="border: 1px solid #1a1a1a; color: #506858;">
              ↻
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── SKILLS ─────────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Skills</h3>
      <div class="text-xs font-mono mb-3 text-neutral-400">
        Bonus: {{ bonusTotal }} / {{ bonusPointCap }}
      </div>
      <div class="grid grid-cols-2 gap-x-6">
        <div v-for="col in skillColumns" :key="col.id">
          <div class="flex items-center gap-1.5 pb-1.5 mb-0.5 border-b border-neutral-700">
            <span v-if="session.isActive" class="text-xs text-neutral-500 shrink-0 w-4 text-center" title="Failed roll this session">✓</span>
            <span class="flex-1"></span>
            <span class="text-xs text-neutral-500 shrink-0 w-4 text-center" title="Profession skill">★</span>
            <span class="text-xs text-neutral-500 shrink-0 w-11 text-center">Base</span>
            <span class="text-xs text-neutral-500 shrink-0 w-9 text-center">Bonus</span>
            <span class="text-xs text-neutral-500 shrink-0 w-10 text-center">Earn</span>
            <span class="text-xs text-neutral-500 shrink-0 w-6 text-center">Tot</span>
          </div>
          <div v-for="skill in col.skills" :key="skill.key"
               class="flex flex-col py-1.5 border-b border-neutral-900/80 skill-row">
            <div class="flex items-center gap-1.5">
              <input v-if="session.isActive" type="checkbox" :disabled="readonly"
                     v-model="form.skills[skill.key].pendingCheck"
                     title="Check if you used this skill and failed the roll this session"
                     class="shrink-0 w-4 h-4 accent-neutral-600" />
              <span class="text-xs text-neutral-400 flex-1 leading-tight truncate">
                {{ skill.label }}
                <input v-if="skill.specify"
                       v-model="form.skills[`${skill.key}Specify`]"
                       :disabled="readonly"
                       class="bg-transparent border-b border-neutral-700 text-neutral-400 text-xs w-20 ml-1 focus:outline-none focus:border-neutral-500 disabled:cursor-default"
                       placeholder="spec." />
              </span>
              <button @click="toggleProfessionalSkill(skill.key)" :disabled="readonly" type="button"
                      title="Mark as one of this character's Profession skills — bonus points on a Profession skill replace the base rate instead of stacking with it"
                      class="text-xs shrink-0 w-4 leading-none disabled:cursor-default skill-star-btn"
                      :class="form.skills[skill.key].isProfessional ? 'skill-star-active' : 'skill-star-inactive'">
                {{ form.skills[skill.key].isProfessional ? '★' : '☆' }}
              </button>
              <span v-if="!form.skills[skill.key].isProfessional"
                    class="text-xs text-neutral-400 shrink-0 w-11 text-center tabular-nums" title="Base">{{ skill.base }}</span>
              <input v-else v-model.number="form.skills[skill.key].professionalBaserate" :disabled="readonly"
                     type="number" min="0" title="Professional baserate (manual — replaces base)"
                     class="w-11 bg-neutral-900 border border-yellow-900 rounded px-1.5 py-0.5 text-sm text-center font-mono text-yellow-500 focus:outline-none focus:border-yellow-600 disabled:opacity-60 disabled:cursor-default shrink-0" />
              <button @click="cycleBonus(skill.key)" :disabled="readonly" type="button"
                      title="Bonus — click to cycle 0 → +20 → +40"
                      class="text-xs font-mono shrink-0 w-9 py-0.5 rounded transition-colors disabled:opacity-50 disabled:cursor-default skill-prof-btn"
                      :class="form.skills[skill.key].bonus > 0 ? 'skill-prof-active' : 'skill-prof-inactive'">
                +{{ form.skills[skill.key].bonus }}
              </button>
              <input v-model.number="form.skills[skill.key].earned" :disabled="readonly"
                     type="number" min="0" title="Earned points"
                     class="w-10 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-sm text-center font-mono text-neutral-300 focus:outline-none focus:border-neutral-600 disabled:opacity-60 disabled:cursor-default shrink-0" />
              <span class="text-xs font-mono font-bold shrink-0 w-6 text-right tabular-nums" style="color: #c4c4c4;" title="Total">
                {{ skillTotal(skill, form.skills[skill.key]) }}
              </span>
            </div>
            <div v-if="form.skills[skill.key].pendingCheck" class="flex items-center gap-1.5 pt-1 pl-1">
              <span class="text-xs text-neutral-500 shrink-0">Failed roll —</span>
              <button @click="rollEarned(skill.key)" :disabled="readonly" type="button"
                      class="text-xs font-mono shrink-0 px-2 py-0.5 rounded transition-colors bp-calc-btn"
                      style="border: 1px solid #1a1a1a; color: #506858;">
                🎲 Roll 1d4
              </button>
              <span class="text-xs text-neutral-600 shrink-0">or</span>
              <input v-model.number="manualRollInputs[skill.key]" :disabled="readonly"
                     type="number" min="1" max="4" placeholder="1-4"
                     class="w-10 bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-xs text-center font-mono text-neutral-300 focus:outline-none focus:border-neutral-600 disabled:opacity-60 disabled:cursor-default shrink-0" />
              <button @click="applyManualRoll(skill.key)" :disabled="readonly" type="button"
                      class="text-xs font-mono shrink-0 px-2 py-0.5 rounded transition-colors bp-calc-btn"
                      style="border: 1px solid #1a1a1a; color: #506858;">
                Apply
              </button>
            </div>
          </div>
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
                  class="text-neutral-500 hover:text-red-500 transition-colors shrink-0 px-1 text-sm">×</button>
        </div>
      </div>
      <button v-if="!readonly && form.bonds.length < 6"
              @click="addBond"
              class="mt-2 text-xs text-neutral-400 hover:text-neutral-300 transition-colors">
        + Tilføj bond
      </button>
    </section>

    <!-- ─── WEAPONS ────────────────────────────────────────────────── -->
    <section>
      <h3 class="section-heading">Weapons</h3>
      <div class="space-y-3">
        <div v-for="(weapon, i) in form.weapons" :key="i"
             class="p-3 space-y-2" style="border: 1px solid #1a1a1a;">
          <div class="flex items-center gap-2">
            <input v-model="weapon.name" :disabled="readonly"
                   class="sheet-input flex-1" placeholder="Weapon" />
            <button v-if="!readonly" @click="removeWeapon(i)"
                    class="text-neutral-500 hover:text-red-500 transition-colors shrink-0 px-1 text-sm">×</button>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="field-label">Skill %</label>
              <input v-model.number="weapon.skill" :disabled="readonly"
                     type="number" min="0" class="sheet-input text-center font-mono w-full" />
            </div>
            <div>
              <label class="field-label">Base Range</label>
              <input v-model="weapon.range" :disabled="readonly" class="sheet-input text-center font-mono w-full" />
            </div>
            <div>
              <label class="field-label">Damage</label>
              <input v-model="weapon.damage" :disabled="readonly" class="sheet-input text-center font-mono w-full" />
            </div>
            <div>
              <label class="field-label">Armor Piercing</label>
              <input v-model="weapon.armorPiercing" :disabled="readonly" class="sheet-input text-center font-mono w-full" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="field-label">Lethality %</label>
              <input v-model.number="weapon.lethality" :disabled="readonly"
                     type="number" min="0" class="sheet-input text-center font-mono w-full" />
            </div>
            <div>
              <label class="field-label">Kill Radius</label>
              <input v-model="weapon.killRadius" :disabled="readonly" class="sheet-input text-center font-mono w-full" />
            </div>
            <div>
              <label class="field-label">Ammo</label>
              <input v-model="weapon.ammo" :disabled="readonly" class="sheet-input text-center font-mono w-full" />
            </div>
          </div>
        </div>
      </div>
      <button v-if="!readonly && form.weapons.length < 5"
              @click="addWeapon"
              class="mt-2 text-xs text-neutral-400 hover:text-neutral-300 transition-colors">
        + Tilføj weapon
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
      <span v-if="savedAt" class="text-xs text-neutral-400">Gemt {{ savedAt }}</span>
      <span v-if="saveError" class="text-xs text-red-500">{{ saveError }}</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { SKILLS, mergeSkillsData, skillTotal } from '../config/skillsList'
import { useCharacterStore } from '../stores/character'
import { useAuthStore } from '../stores/auth'
import { useSessionStore } from '../stores/session'
import { supabase } from '../lib/supabase'

const props = defineProps({
  groupId: { type: String, required: true },
  initialData: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:dirty'])

const character = useCharacterStore()
const auth = useAuthStore()
const session = useSessionStore()

const statPointCap = ref(72)
const bonusPointCap = ref(160)
function handleBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  const { data } = await supabase
    .from('group_settings')
    .select('stat_point_cap')
    .eq('group_id', props.groupId)
    .maybeSingle()
  if (data?.stat_point_cap) statPointCap.value = data.stat_point_cap
})
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

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
    bpCurrent:  data?.bpCurrent  ?? null,
    skills: mergeSkillsData(data?.skills),
    bonds: data?.bonds?.length
      ? data.bonds.map(b => ({ ...b }))
      : [{ name: '', score: 4 }],
    weapons: data?.weapons?.length
      ? data.weapons.map(w => ({ ...w }))
      : [],
    notes: data?.notes ?? '',
  }
}

const form = ref(buildForm(props.initialData))
const savedSnapshot = ref(JSON.stringify(form.value))

watch(() => props.initialData, (data) => {
  form.value = buildForm(data)
  savedSnapshot.value = JSON.stringify(form.value)
}, { deep: true })

const isDirty = computed(() => !props.readonly && JSON.stringify(form.value) !== savedSnapshot.value)
watch(isDirty, (dirty) => emit('update:dirty', dirty))

const hpMax = computed(() =>
  Math.ceil((form.value.stats.str + form.value.stats.con) / 2)
)
const sanStart = computed(() => form.value.stats.pow * 5)
const unnaturalSkill = SKILLS.find(s => s.key === 'unnatural')
const sanMax = computed(() =>
  99 - skillTotal(unnaturalSkill, form.value.skills.unnatural)
)
watch(sanMax, (newMax) => {
  if (form.value.sanCurrent != null && form.value.sanCurrent > newMax) {
    form.value.sanCurrent = newMax
  }
}, { immediate: true })

// Not live-tracked on purpose: BP is a one-time snapshot the player takes
// via the ↻ button, not a value that should silently drift as SAN changes.
function calculateBP() {
  form.value.bpCurrent = (form.value.sanCurrent ?? sanStart.value) - form.value.stats.pow
}
const statsTotal = computed(() =>
  BASE_STATS.reduce((sum, stat) => sum + (form.value.stats[stat.key] || 0), 0)
)

const bonusTotal = computed(() =>
  SKILLS.reduce((sum, skill) => sum + (form.value.skills[skill.key]?.bonus || 0), 0)
)

// Down-then-across column split so the alphabetical SKILLS order reads
// top-to-bottom in column 1, then top-to-bottom in column 2 — CSS grid's
// default row-wise auto-flow would otherwise interleave the alphabet
// across both columns.
const skillColumns = computed(() => {
  const half = Math.ceil(SKILLS.length / 2)
  return [
    { id: 'a', skills: SKILLS.slice(0, half) },
    { id: 'b', skills: SKILLS.slice(half) },
  ]
})

function cycleBonus(key) {
  const entry = form.value.skills[key]
  entry.bonus = entry.bonus === 0 ? 20 : entry.bonus === 20 ? 40 : 0
}

function toggleProfessionalSkill(key) {
  const entry = form.value.skills[key]
  entry.isProfessional = !entry.isProfessional
}

const manualRollInputs = ref({})

function rollEarned(key) {
  const roll = Math.floor(Math.random() * 4) + 1
  const entry = form.value.skills[key]
  entry.earned += roll
  entry.pendingCheck = false
}

function applyManualRoll(key) {
  const value = manualRollInputs.value[key]
  if (!value || value < 1) return
  const entry = form.value.skills[key]
  entry.earned += value
  entry.pendingCheck = false
  manualRollInputs.value[key] = null
}

function addBond() {
  form.value.bonds.push({ name: '', score: form.value.stats.cha })
}
function removeBond(i) {
  form.value.bonds.splice(i, 1)
}

function addWeapon() {
  form.value.weapons.push({
    name: '', skill: 0, range: '', damage: '',
    armorPiercing: '', lethality: 0, killRadius: '', ammo: '',
  })
}
function removeWeapon(i) {
  form.value.weapons.splice(i, 1)
}

const savedAt = ref('')
const saveError = ref('')

async function save() {
  saveError.value = ''
  try {
    await character.saveMySheet(props.groupId, auth.user.id, form.value)
    savedSnapshot.value = JSON.stringify(form.value)
    savedAt.value = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    saveError.value = err.message
  }
}
</script>

<style scoped>
.section-heading {
  font-size: 0.7rem;
  font-family: monospace;
  color: #6b8578;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid #2a2a2a;
}
.field-label {
  font-size: 0.68rem;
  font-family: monospace;
  color: #6b8578;
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
.bp-calc-btn:hover { border-color: #3a5a44; color: #888; }
.skill-prof-inactive { background: transparent; border: 1px solid #2a2a2a; color: #6b6b6b; }
.skill-prof-inactive:hover:not(:disabled) { border-color: #3a3a3a; color: #999; }
.skill-prof-active { background: #1f4a2a; border: 1px solid #4a7c59; color: #86efac; }
.skill-prof-active:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; }
.skill-star-inactive { color: #4a4a4a; }
.skill-star-inactive:hover:not(:disabled) { color: #999; }
.skill-star-active { color: #eab308; }
.skill-star-active:hover:not(:disabled) { color: #fde047; }
.skill-row:hover { background: #1c1c1c; }
</style>
