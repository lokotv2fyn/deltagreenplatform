<template>
  <div class="h-screen text-neutral-200 flex flex-col overflow-hidden" style="background-color: #080808;">

    <!-- Header -->
    <header class="px-6 py-3 flex items-center gap-4 shrink-0" style="border-bottom: 1px solid #1a1a1a;">
      <RouterLink to="/dashboard"
                  class="text-xs font-mono tracking-[0.1em] transition-colors back-link"
                  style="color: #506858;">
        ← Operationer
      </RouterLink>
      <svg width="10" height="9" viewBox="0 0 10 9" fill="none" class="shrink-0">
        <polygon points="5,0 0,8 10,8" fill="#4a7c59"/>
      </svg>
      <span class="text-xs font-mono tracking-wide" style="color: #c4c4c4;">{{ session.group?.name }}</span>
      <span class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #92400e;">Handler</span>

      <div class="ml-auto flex items-center gap-3">
        <span v-if="session.currentSession" class="text-xs font-mono tracking-wider"
              :style="session.isActive ? 'color: #4a7c59;' : 'color: #92400e;'">
          {{ session.isActive ? '● AKTIV' : '◌ PAUSET' }}
          <span v-if="session.currentSession.label" class="ml-1" style="color: #506858;">
            {{ session.currentSession.label }}
          </span>
        </span>
        <span v-else class="text-xs font-mono tracking-wider" style="color: #506858;">Ingen session</span>

        <button v-if="!session.currentSession || session.isPaused"
                @click="promptStartSession"
                class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1 transition-colors session-btn-start"
                style="border: 1px solid #1f4a2a; color: #4a7c59;">
          Start session
        </button>
        <button v-if="session.isActive"
                @click="doStopSession"
                class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1 transition-colors session-btn-stop"
                style="border: 1px solid #2a2a2a; color: #5e8068;">
          Stop session
        </button>

        <span class="text-xs font-mono" style="color: #2a3a2e; padding-left: 0.5rem; border-left: 1px solid #1a1a1a;">v0.513</span>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="px-6 flex shrink-0" style="border-bottom: 1px solid #1a1a1a;">
      <button v-for="tab in tabs" :key="tab.id"
              @click="activeTab = tab.id"
              class="text-xs font-mono tracking-[0.12em] uppercase px-4 py-2.5 transition-colors tab-btn"
              :style="activeTab === tab.id
                ? 'border-bottom: 1px solid #888; color: #c4c4c4; margin-bottom: -1px;'
                : 'border-bottom: 1px solid transparent; color: #506858; margin-bottom: -1px;'">
        {{ tab.label }}
      </button>
    </nav>

    <!-- Content -->
    <div class="flex-1" :class="activeTab === 'visual' ? 'overflow-hidden' : 'overflow-auto p-6'">

      <!-- ─── VISUELT ──────────────────────────────────────────────────── -->
      <template v-if="activeTab === 'visual'">
        <VisualBoard
          :group-id="groupId"
          :session-id="session.currentSession?.id ?? null"
          :is-handler="true"
          :can-edit="true"
          :auto-reveal-enabled="autoReveal"
        />
      </template>

      <!-- ─── BOARD ─────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'board'">
        <div class="flex items-center justify-between mb-6">
          <p class="text-xs font-mono tracking-wider" style="color: #5e8068;">
            {{ board.cards.length }} kort
            <span v-if="board.onBoard.length" style="color: #506858;"> · {{ board.onBoard.length }} på bordet</span>
          </p>
          <button @click="showCreate = true"
                  class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                  style="border: 1px solid #2a2a2a; color: #5e8068;">
            + Opret kort
          </button>
        </div>

        <div v-if="board.loading" class="text-xs font-mono tracking-wider" style="color: #506858;">Henter filer…</div>

        <div v-else>
          <TheChain :is-handler="true" :can-edit="true" />

          <section v-if="board.onBoard.length" class="mb-8">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">På bordet</p>
            <div class="space-y-1">
              <CardItem v-for="card in board.onBoard" :key="card.id"
                        :card="card" :is-handler="true" :can-edit-chain="true" />
            </div>
          </section>

          <section v-if="board.inDeck.length">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">Bunke</p>
            <div class="space-y-1">
              <CardItem v-for="card in board.inDeck" :key="card.id"
                        :card="card" :is-handler="true" :can-edit-chain="true" />
            </div>
          </section>

          <div v-if="!board.cards.length" class="text-xs font-mono" style="color: #506858;">
            Ingen kort endnu.
          </div>
        </div>
      </template>

      <!-- ─── AGENTER ──────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'agents'">
        <div v-if="character.loading" class="text-xs font-mono" style="color: #506858;">Henter agenter…</div>
        <div v-else-if="!character.allSheets.length" class="text-xs font-mono" style="color: #506858;">
          Ingen agenter har oprettet karakterark endnu.
        </div>
        <div v-else>
          <div class="flex gap-0 mb-6" style="border-bottom: 1px solid #1a1a1a;">
            <button v-for="agent in character.allSheets" :key="agent.userId"
                    @click="selectedAgent = agent.userId"
                    class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-2 transition-colors tab-btn"
                    :style="selectedAgent === agent.userId
                      ? 'border-bottom: 1px solid #888; color: #c4c4c4; margin-bottom: -1px;'
                      : 'border-bottom: 1px solid transparent; color: #506858; margin-bottom: -1px;'">
              {{ agent.displayName }}
            </button>
          </div>
          <template v-for="agent in character.allSheets" :key="agent.userId">
            <div v-if="selectedAgent === agent.userId">
              <p v-if="!agent.sheet" class="text-xs font-mono" style="color: #506858;">
                {{ agent.displayName }} har ikke udfyldt karakterark endnu.
              </p>
              <CharacterSheet v-else :group-id="groupId" :initial-data="agent.sheet.data" :readonly="true" />
            </div>
          </template>
        </div>
      </template>

      <!-- ─── SPILLERNOTER ──────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'notes'">
        <div v-if="notesLoading" class="text-xs font-mono" style="color: #506858;">Henter noter…</div>
        <div v-else-if="!notes.length" class="text-xs font-mono" style="color: #506858;">Ingen spillernoter endnu.</div>
        <div v-else class="space-y-6">
          <div v-for="(group, author) in notesByAuthor" :key="author">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">{{ author }}</p>
            <div class="space-y-2">
              <div v-for="note in group" :key="note.id"
                   class="p-4" style="background: #0d0d0d; border: 1px solid #1a1a1a;">
                <p class="text-sm font-mono whitespace-pre-wrap leading-relaxed" style="color: #c4c4c4;">{{ note.body }}</p>
                <p v-if="note.card" class="text-xs font-mono mt-2" style="color: #506858;">→ {{ note.card.label }}</p>
                <p class="text-xs font-mono mt-1" style="color: #2a2a2a;">{{ formatDate(note.updated_at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── AKTIVITET ──────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'activity'">
        <div v-if="activityLoading" class="text-xs font-mono" style="color: #506858;">Henter log…</div>
        <div v-else-if="!activity.length" class="text-xs font-mono" style="color: #506858;">Ingen aktivitet endnu.</div>
        <ul v-else class="space-y-1">
          <li v-for="entry in activity" :key="entry.id"
              class="flex items-baseline gap-4 text-xs font-mono">
            <span class="shrink-0 tabular-nums" style="color: #506858;">{{ formatTime(entry.created_at) }}</span>
            <span style="color: #5e8068;">
              <span style="color: #888;">{{ entry.actor?.display_name ?? '?' }}</span>
              {{ actionLabel(entry.action) }}
              <span v-if="entry.target_id" style="color: #506858;">{{ cardLabel(entry.target_id) }}</span>
            </span>
          </li>
        </ul>
      </template>

      <!-- ─── INDSTILLINGER ─────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'settings'">
        <div class="max-w-md space-y-10">

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              Invite-link
            </p>
            <div v-if="session.group?.invite_code" class="space-y-2">
              <div class="flex items-center gap-2">
                <code class="flex-1 px-3 py-2 text-xs font-mono select-all"
                      style="background: #0d0d0d; border: 1px solid #1a1a1a; color: #888;">
                  {{ inviteUrl }}
                </code>
                <button @click="copyInvite"
                        class="text-xs font-mono px-3 py-2 transition-colors action-btn shrink-0"
                        style="border: 1px solid #2a2a2a; color: #5e8068;">
                  {{ copied ? 'Kopieret' : 'Kopiér' }}
                </button>
              </div>
              <p v-if="session.group.invite_expires_at" class="text-xs font-mono" style="color: #506858;">
                Udløber {{ formatDate(session.group.invite_expires_at) }}
              </p>
              <button @click="regenerateInvite"
                      class="text-xs font-mono transition-colors action-btn-text"
                      style="color: #506858;">
                Generér nyt link →
              </button>
            </div>
          </section>

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              Spiller-kort
            </p>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="autoReveal" @change="saveAutoReveal" class="accent-neutral-600 w-3.5 h-3.5" />
              <span class="text-sm font-mono" style="color: #888;">Auto-reveal spiller-oprettede kort</span>
            </label>
            <p class="text-xs font-mono mt-1 ml-6" style="color: #506858;">
              Når aktiv: kort oprettet af spillere vises for alle med det samme
            </p>
          </section>

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              Gruppenavn
            </p>
            <input v-model="groupName" type="text"
                   class="w-full font-mono text-sm px-3 py-2 focus:outline-none mb-2"
                   style="background: #0d0d0d; border: 1px solid #1a1a1a; color: #c4c4c4;"
                   placeholder="Navn på operationen" />
            <button @click="saveName"
                    class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                    style="border: 1px solid #2a2a2a; color: #5e8068;">
              Gem
            </button>
          </section>

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              Beskrivelse
            </p>
            <textarea v-model="groupDescription" rows="3"
                      class="w-full font-mono text-sm px-3 py-2 focus:outline-none resize-none"
                      style="background: #0d0d0d; border: 1px solid #1a1a1a; color: #c4c4c4;"
                      placeholder="Vises for agenter på forsiden" />
            <button @click="saveDescription"
                    class="mt-2 text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                    style="border: 1px solid #2a2a2a; color: #5e8068;">
              Gem
            </button>
          </section>

        </div>
      </template>

    </div>

    <!-- Create card modal -->
    <CreateCardModal
      v-if="showCreate"
      :group-id="groupId"
      :session-id="session.currentSession?.id ?? null"
      @close="showCreate = false"
      @created="showCreate = false"
    />

    <!-- Start session dialog -->
    <div v-if="showStartDialog"
         class="fixed inset-0 flex items-center justify-center p-4 z-50"
         style="background: rgba(0,0,0,0.85);"
         @click.self="showStartDialog = false">
      <div class="w-full max-w-sm" style="background: #0d0d0d; border: 1px solid #2a2a2a;">
        <div class="px-6 py-4" style="border-bottom: 1px solid #1a1a1a;">
          <p class="text-xs font-mono tracking-[0.25em] uppercase mb-1" style="color: #506858;">Ny session</p>
          <h2 class="text-sm font-mono" style="color: #c4c4c4;">Start operationssession</h2>
        </div>
        <div class="px-6 py-5">
          <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
            Label <span style="color: #3a5040;">(valgfri)</span>
          </label>
          <input v-model="sessionLabel" type="text" placeholder="fx Session 3 — Sygehuset"
                 class="w-full font-mono text-sm px-3 py-2 focus:outline-none"
                 style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;" />
        </div>
        <div class="px-6 py-4 flex justify-end gap-4" style="border-top: 1px solid #1a1a1a;">
          <button @click="showStartDialog = false"
                  class="text-xs font-mono tracking-[0.1em] uppercase transition-colors"
                  style="color: #506858;">
            Annuller
          </button>
          <button @click="doStartSession"
                  class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-2 transition-colors session-btn-start"
                  style="border: 1px solid #1f4a2a; color: #4a7c59;">
            Start
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { useSessionStore } from '../../stores/session'
import { useBoardStore } from '../../stores/board'
import CardItem from '../../components/board/CardItem.vue'
import CreateCardModal from '../../components/board/CreateCardModal.vue'
import TheChain from '../../components/board/TheChain.vue'
import CharacterSheet from '../../components/CharacterSheet.vue'
import { useCharacterStore } from '../../stores/character'
import VisualBoard from '../../components/board/VisualBoard.vue'

const route = useRoute()
const groupId = route.params.groupId

const session = useSessionStore()
const board = useBoardStore()
const character = useCharacterStore()

const activeTab = ref('board')
const selectedAgent = ref(null)
const showCreate = ref(false)
const showStartDialog = ref(false)
const sessionLabel = ref('')

const tabs = [
  { id: 'board',    label: 'Board' },
  { id: 'visual',   label: 'Visuelt' },
  { id: 'agents',   label: 'Agenter' },
  { id: 'notes',    label: 'Spillernoter' },
  { id: 'activity', label: 'Aktivitet' },
  { id: 'settings', label: 'Indstillinger' },
]

// ─── Notes ───────────────────────────────────────────────────────────────────
const notes = ref([])
const notesLoading = ref(false)

const notesByAuthor = computed(() => {
  const grouped = {}
  for (const n of notes.value) {
    const name = n.author?.display_name ?? 'Ukendt'
    if (!grouped[name]) grouped[name] = []
    grouped[name].push(n)
  }
  return grouped
})

async function loadNotes() {
  notesLoading.value = true
  const { data } = await supabase
    .from('private_notes')
    .select('*, author:profiles(display_name), card:cards(label)')
    .eq('group_id', groupId)
    .order('updated_at', { ascending: false })
  notes.value = data ?? []
  notesLoading.value = false
}

// ─── Activity ────────────────────────────────────────────────────────────────
const activity = ref([])
const activityLoading = ref(false)

async function loadActivity() {
  activityLoading.value = true
  const { data } = await supabase
    .from('activity_log')
    .select('*, actor:profiles(display_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(200)
  activity.value = data ?? []
  activityLoading.value = false
}

function cardLabel(cardId) {
  return board.cards.find(c => c.id === cardId)?.label ?? ''
}

const ACTION_LABELS = {
  card_created: 'oprettede kort',
  card_revealed: 'revealed kort',
  card_minimized: 'minimerede kort',
  card_restored: 'åbnede kort',
  position_moved: 'flyttede',
  chain_added: 'tilføjede rød tråd på',
  chain_removed: 'fjernede rød tråd fra',
  note_created: 'oprettede en note',
  note_updated: 'opdaterede en note',
}
function actionLabel(action) {
  return ACTION_LABELS[action] ?? action
}

// ─── Settings ────────────────────────────────────────────────────────────────
const autoReveal = ref(true)
const groupName = ref('')
const groupDescription = ref('')
const copied = ref(false)

const inviteUrl = computed(() =>
  session.group?.invite_code
    ? `${window.location.origin}/join/${session.group.invite_code}`
    : ''
)

async function loadSettings() {
  const { data } = await supabase
    .from('group_settings')
    .select('auto_reveal_player_cards')
    .eq('group_id', groupId)
    .single()
  if (data) autoReveal.value = data.auto_reveal_player_cards
  groupName.value = session.group?.name ?? ''
  groupDescription.value = session.group?.description ?? ''
}

async function saveAutoReveal() {
  await supabase
    .from('group_settings')
    .update({ auto_reveal_player_cards: autoReveal.value })
    .eq('group_id', groupId)
}

async function saveName() {
  if (!groupName.value.trim()) return
  await supabase
    .from('groups')
    .update({ name: groupName.value.trim() })
    .eq('id', groupId)
  await session.loadGroup(groupId)
}

async function saveDescription() {
  await supabase
    .from('groups')
    .update({ description: groupDescription.value })
    .eq('id', groupId)
}

async function regenerateInvite() {
  const newCode = Math.random().toString(36).substring(2, 10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('groups')
    .update({ invite_code: newCode, invite_expires_at: expiresAt })
    .eq('id', groupId)
  await session.loadGroup(groupId)
}

async function copyInvite() {
  await navigator.clipboard.writeText(inviteUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// ─── Session ─────────────────────────────────────────────────────────────────
function promptStartSession() {
  sessionLabel.value = ''
  showStartDialog.value = true
}

async function doStartSession() {
  await session.startSession(sessionLabel.value || null)
  showStartDialog.value = false
}

async function doStopSession() {
  await session.stopSession()
}

// ─── Formatering ─────────────────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

// ─── Watch tab changes ───────────────────────────────────────────────────────
watch(activeTab, async (tab) => {
  if (tab === 'notes') loadNotes()
  if (tab === 'activity') loadActivity()
  if (tab === 'settings') loadSettings()
  if (tab === 'agents') {
    await character.loadAllSheets(groupId)
    if (!selectedAgent.value && character.allSheets.length) {
      selectedAgent.value = character.allSheets[0].userId
    }
  }
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await session.loadGroup(groupId)
  await board.loadBoard(groupId)
  board.subscribeRealtime(groupId)
  session.subscribeSession(groupId)
})

onUnmounted(() => {
  board.reset()
  session.reset()
  character.reset()
})
</script>

<style scoped>
.back-link:hover { color: #dc2626; }
.tab-btn:hover { color: #888; }
.action-btn:hover { border-color: #5e8068; color: #c4c4c4; }
.action-btn-text:hover { color: #888; }
.session-btn-start:hover { border-color: #4a7c59; color: #86efac; }
.session-btn-stop:hover { border-color: #5e8068; color: #888; }
</style>
