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
      <span class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #1f4a2a;">Agent</span>

      <div class="ml-auto flex items-center gap-3">
        <span v-if="session.isActive" class="text-xs font-mono tracking-wider" style="color: #4a7c59;">● AKTIV</span>
        <span v-else-if="session.isPaused" class="text-xs font-mono tracking-wider" style="color: #92400e;">◌ PAUSET</span>
        <span v-else class="text-xs font-mono tracking-wider" style="color: #506858;">Ingen session</span>
        <span class="text-xs font-mono" style="color: #2a3a2e; padding-left: 0.5rem; border-left: 1px solid #1a1a1a;">v0.513</span>
      </div>
    </header>

    <!-- Pause-banner -->
    <div v-if="!session.isActive && session.currentSession"
         class="px-6 py-2 text-xs font-mono text-center"
         style="background: rgba(146,64,14,0.08); border-bottom: 1px solid rgba(146,64,14,0.2); color: #92400e;">
      Sessionen er pauset af Handler — boardet er midlertidigt låst for ændringer.
    </div>
    <div v-else-if="!session.currentSession"
         class="px-6 py-2 text-xs font-mono text-center"
         style="background: rgba(26,26,26,0.6); border-bottom: 1px solid #1a1a1a; color: #506858;">
      Ingen aktiv session — Handler har ikke startet sessionen endnu.
    </div>

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

    <div class="flex-1" :class="activeTab === 'visual' ? 'overflow-hidden' : 'overflow-auto p-6'">

      <!-- ─── VISUELT ─────────────────────────────────────────────── -->
      <template v-if="activeTab === 'visual'">
        <VisualBoard
          :group-id="groupId"
          :session-id="session.currentSession?.id ?? null"
          :is-handler="false"
          :can-edit="session.isActive"
          :auto-reveal-enabled="autoReveal"
        />
      </template>

      <!-- ─── BOARD ─────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'board'">
        <div class="flex items-center justify-between mb-6">
          <p class="text-xs font-mono tracking-wider" style="color: #5e8068;">{{ board.cards.length }} kort</p>
          <button v-if="session.isActive" @click="showCreate = true"
                  class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                  style="border: 1px solid #2a2a2a; color: #5e8068;">
            + Opret kort
          </button>
          <span v-else class="text-xs font-mono" style="color: #506858;">
            {{ session.isPaused ? 'Pauset' : 'Afventer session' }}
          </span>
        </div>

        <div v-if="board.loading" class="text-xs font-mono" style="color: #506858;">Henter board…</div>

        <div v-else>
          <TheChain :is-handler="false" :can-edit="session.isActive" />

          <section v-if="board.onBoard.length" class="mb-8">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">På bordet</p>
            <div class="space-y-1">
              <CardItem v-for="card in board.onBoard" :key="card.id"
                        :card="card" :is-handler="false" :can-edit-chain="session.isActive" />
            </div>
          </section>

          <section v-if="board.inDeck.length">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">Bunke</p>
            <div class="space-y-1">
              <CardItem v-for="card in board.inDeck" :key="card.id"
                        :card="card" :is-handler="false" :can-edit-chain="session.isActive" />
            </div>
          </section>

          <div v-if="!board.cards.length" class="text-xs font-mono" style="color: #506858;">
            Ingen kort er revealed endnu.
          </div>
        </div>
      </template>

      <!-- ─── NOTER ─────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'notes'">
        <div class="max-w-xl space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #506858;">Mine noter</p>
            <button v-if="session.isActive || !session.currentSession"
                    @click="openNewNote()"
                    class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                    style="border: 1px solid #2a2a2a; color: #5e8068;">
              + Ny note
            </button>
          </div>

          <div v-if="notesLoading" class="text-xs font-mono" style="color: #506858;">Henter noter…</div>
          <div v-else-if="!notes.length && !editingNote" class="text-xs font-mono" style="color: #506858;">Ingen noter endnu.</div>

          <div v-if="editingNote !== null"
               class="p-4 space-y-3"
               style="background: #0d0d0d; border: 1px solid #2a2a2a;">
            <div>
              <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
                Kobl til kort <span style="color: #252525;">(valgfri)</span>
              </label>
              <select v-model="editingNote.card_id"
                      class="w-full font-mono text-sm px-3 py-1.5 focus:outline-none"
                      style="background: #080808; border: 1px solid #2a2a2a; color: #888;">
                <option :value="null">— ingen —</option>
                <option v-for="c in board.cards" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
            </div>
            <textarea v-model="editingNote.body" rows="5" placeholder="Skriv din note…"
                      class="w-full font-mono text-sm px-3 py-2 focus:outline-none resize-y"
                      style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;"
                      autofocus />
            <div class="flex justify-between items-center">
              <button v-if="editingNote.id" @click="deleteNote(editingNote.id)"
                      class="text-xs font-mono transition-colors delete-btn" style="color: #506858;">
                Slet
              </button>
              <div v-else />
              <div class="flex gap-4">
                <button @click="editingNote = null"
                        class="text-xs font-mono transition-colors" style="color: #506858;">
                  Annuller
                </button>
                <button @click="saveNote" :disabled="!editingNote.body.trim() || savingNote"
                        class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-1.5 transition-colors action-btn disabled:opacity-30"
                        style="border: 1px solid #4a7c59; color: #4a7c59;">
                  {{ savingNote ? 'Gemmer…' : 'Gem' }}
                </button>
              </div>
            </div>
          </div>

          <div v-for="note in notes" :key="note.id"
               class="p-4 space-y-2"
               style="background: #0d0d0d; border: 1px solid #1a1a1a;">
            <p class="text-sm font-mono whitespace-pre-wrap leading-relaxed" style="color: #c4c4c4;">{{ note.body }}</p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 text-xs font-mono" style="color: #506858;">
                <span v-if="note.card">→ {{ note.card.label }}</span>
                <span>{{ formatDate(note.updated_at) }}</span>
              </div>
              <button v-if="session.isActive" @click="openEditNote(note)"
                      class="text-xs font-mono transition-colors action-btn-text" style="color: #506858;">
                Rediger
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── KARAKTER ─────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'character'">
        <div v-if="character.loading" class="text-xs font-mono" style="color: #506858;">Henter karakterark…</div>
        <CharacterSheet v-else :group-id="groupId" :initial-data="character.mySheet?.data ?? null" />
      </template>

    </div>

    <!-- Reveal interrupt -->
    <RevealInterrupt v-if="interruptCard" :card="interruptCard" @close="dismissInterrupt()" />

    <!-- Create card modal -->
    <CreateCardModal
      v-if="showCreate"
      :group-id="groupId"
      :session-id="session.currentSession?.id ?? null"
      :player-mode="true"
      :auto-reveal-enabled="autoReveal"
      @close="showCreate = false"
      @created="showCreate = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import { useSessionStore } from '../../stores/session'
import { useBoardStore } from '../../stores/board'
import CardItem from '../../components/board/CardItem.vue'
import CreateCardModal from '../../components/board/CreateCardModal.vue'
import TheChain from '../../components/board/TheChain.vue'
import RevealInterrupt from '../../components/RevealInterrupt.vue'
import CharacterSheet from '../../components/CharacterSheet.vue'
import { useCharacterStore } from '../../stores/character'
import VisualBoard from '../../components/board/VisualBoard.vue'

const route = useRoute()
const groupId = route.params.groupId

const auth = useAuthStore()
const session = useSessionStore()
const board = useBoardStore()
const character = useCharacterStore()

const activeTab = ref('board')
const showCreate = ref(false)
const autoReveal = ref(true)

// ─── Reveal interrupt ─────────────────────────────────────────────────────────
const revealQueue = ref([])
const interruptCard = computed(() =>
  revealQueue.value.length ? board.cards.find(c => c.id === revealQueue.value[0]) ?? null : null
)
function dismissInterrupt() { revealQueue.value.shift() }

watch(() => board.lastRevealedId, (cardId) => {
  if (!cardId) return
  const card = board.cards.find(c => c.id === cardId)
  if (card?.revealed && !revealQueue.value.includes(cardId)) {
    revealQueue.value.push(cardId)
  }
})

const tabs = [
  { id: 'board',     label: 'Board' },
  { id: 'visual',    label: 'Visuelt' },
  { id: 'notes',     label: 'Mine noter' },
  { id: 'character', label: 'Karakter' },
]

// ─── Notes ───────────────────────────────────────────────────────────────────
const notes = ref([])
const notesLoading = ref(false)
const editingNote = ref(null)
const savingNote = ref(false)

async function loadNotes() {
  notesLoading.value = true
  const { data } = await supabase
    .from('private_notes')
    .select('*, card:cards(label)')
    .eq('group_id', groupId)
    .order('updated_at', { ascending: false })
  notes.value = data ?? []
  notesLoading.value = false
}

function openNewNote() {
  editingNote.value = { id: null, body: '', card_id: null }
}

function openEditNote(note) {
  editingNote.value = { id: note.id, body: note.body, card_id: note.card_id }
}

async function saveNote() {
  if (!editingNote.value?.body.trim()) return
  savingNote.value = true
  const { id, body, card_id } = editingNote.value
  if (id) {
    await supabase
      .from('private_notes')
      .update({ body, card_id, updated_at: new Date().toISOString() })
      .eq('id', id)
  } else {
    await supabase
      .from('private_notes')
      .insert({ group_id: groupId, author_id: auth.user.id, body, card_id })
  }
  editingNote.value = null
  savingNote.value = false
  await loadNotes()
}

async function deleteNote(noteId) {
  await supabase.from('private_notes').delete().eq('id', noteId)
  editingNote.value = null
  await loadNotes()
}

watch(activeTab, (tab) => {
  if (tab === 'notes') loadNotes()
  if (tab === 'character') character.loadMySheet(groupId)
})

// ─── Settings ───────────────────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await supabase
    .from('group_settings')
    .select('auto_reveal_player_cards')
    .eq('group_id', groupId)
    .single()
  if (data) autoReveal.value = data.auto_reveal_player_cards
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await session.loadGroup(groupId)
  await board.loadBoard(groupId)
  await loadSettings()
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
.delete-btn:hover { color: #dc2626; }
</style>
