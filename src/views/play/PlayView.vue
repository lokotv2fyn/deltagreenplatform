<template>
  <div class="h-screen text-neutral-200 flex flex-col overflow-hidden" style="background-color: #080808;">

    <!-- Header -->
    <header class="px-6 py-3 flex items-center gap-4 shrink-0" style="border-bottom: 1px solid #1a1a1a;">
      <RouterLink to="/dashboard"
                  class="text-xs font-mono tracking-[0.1em] transition-colors back-link"
                  style="color: #506858;">
        {{ t('nav.back') }}
      </RouterLink>
      <svg width="10" height="9" viewBox="0 0 10 9" fill="none" class="shrink-0">
        <polygon points="5,0 0,8 10,8" fill="#4a7c59"/>
      </svg>
      <span class="text-xs font-mono tracking-wide" style="color: #c4c4c4;">{{ session.group?.name }}</span>
      <span class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #1f4a2a;">{{ t('play.role') }}</span>

      <div class="ml-auto flex items-center gap-3">
        <span v-if="session.isActive" class="text-xs font-mono tracking-wider" style="color: #4a7c59;">{{ t('session.active') }}</span>
        <span v-else-if="session.isPaused" class="text-xs font-mono tracking-wider" style="color: #92400e;">{{ t('session.paused') }}</span>
        <span v-else class="text-xs font-mono tracking-wider" style="color: #506858;">{{ t('session.none') }}</span>
        <button @click="toggleLang"
                class="text-xs font-mono transition-colors"
                style="color: #2a3a2e; padding-left: 0.5rem; border-left: 1px solid #1a1a1a;"
                onmouseenter="this.style.color='#4a7c59'"
                onmouseleave="this.style.color='#2a3a2e'">
          {{ locale === 'da' ? t('lang.en') : t('lang.da') }}
        </button>
        <span class="text-xs font-mono" style="color: #2a3a2e; padding-left: 0.5rem; border-left: 1px solid #1a1a1a;">v0.513</span>
      </div>
    </header>

    <!-- Pause banner -->
    <div v-if="!session.isActive && session.currentSession"
         class="px-6 py-2 text-xs font-mono text-center"
         style="background: rgba(146,64,14,0.08); border-bottom: 1px solid rgba(146,64,14,0.2); color: #92400e;">
      {{ t('session.paused_banner') }}
    </div>
    <div v-else-if="!session.currentSession"
         class="px-6 py-2 text-xs font-mono text-center"
         style="background: rgba(26,26,26,0.6); border-bottom: 1px solid #1a1a1a; color: #506858;">
      {{ t('session.no_session_banner') }}
    </div>

    <!-- Tabs -->
    <nav class="px-6 flex shrink-0" style="border-bottom: 1px solid #1a1a1a;">
      <button v-for="tab in tabs" :key="tab.id"
              @click="activeTab = tab.id"
              class="text-xs font-mono tracking-[0.12em] uppercase px-4 py-2.5 transition-colors tab-btn"
              :style="activeTab === tab.id
                ? 'border-bottom: 1px solid #888; color: #c4c4c4; margin-bottom: -1px;'
                : 'border-bottom: 1px solid transparent; color: #506858; margin-bottom: -1px;'">
        {{ t(tab.labelKey) }}
      </button>
    </nav>

    <div class="flex-1" :class="activeTab === 'visual' ? 'overflow-hidden' : 'overflow-auto p-6'">

      <!-- ─── VISUAL ─────────────────────────────────────────────────── -->
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
          <p class="text-xs font-mono tracking-wider" style="color: #5e8068;">
            {{ t('board.card_count', { n: board.cards.length }) }}
          </p>
          <button v-if="session.isActive" @click="showCreate = true"
                  class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                  style="border: 1px solid #2a2a2a; color: #5e8068;">
            {{ t('board.create') }}
          </button>
          <span v-else class="text-xs font-mono" style="color: #506858;">
            {{ session.isPaused ? t('board.paused') : t('board.awaiting') }}
          </span>
        </div>

        <div v-if="board.loading" class="text-xs font-mono" style="color: #506858;">{{ t('board.loading') }}</div>

        <div v-else>
          <TheChain :is-handler="false" :can-edit="session.isActive" />

          <section v-if="board.onBoard.length" class="mb-8">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">{{ t('board.on_table') }}</p>
            <div class="space-y-1">
              <CardItem v-for="card in board.onBoard" :key="card.id"
                        :card="card" :is-handler="false" :can-edit-chain="session.isActive" />
            </div>
          </section>

          <section v-if="board.inDeck.length">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">{{ t('board.in_deck') }}</p>
            <div class="space-y-1">
              <CardItem v-for="card in board.inDeck" :key="card.id"
                        :card="card" :is-handler="false" :can-edit-chain="session.isActive" />
            </div>
          </section>

          <div v-if="!board.cards.length" class="text-xs font-mono" style="color: #506858;">
            {{ t('board.empty_player') }}
          </div>
        </div>
      </template>

      <!-- ─── NOTES ─────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'notes'">
        <div class="max-w-xl space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #506858;">{{ t('notes.title') }}</p>
            <button v-if="session.isActive || !session.currentSession"
                    @click="openNewNote()"
                    class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                    style="border: 1px solid #2a2a2a; color: #5e8068;">
              {{ t('notes.new') }}
            </button>
          </div>

          <div v-if="notesLoading" class="text-xs font-mono" style="color: #506858;">{{ t('notes.loading') }}</div>
          <div v-else-if="!notes.length && !editingNote" class="text-xs font-mono" style="color: #506858;">{{ t('notes.empty') }}</div>

          <div v-if="editingNote !== null"
               class="p-4 space-y-3"
               style="background: #0d0d0d; border: 1px solid #2a2a2a;">
            <div>
              <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
                {{ t('notes.card_link') }} <span style="color: #252525;">({{ t('dashboard.optional').replace('(','').replace(')','') }})</span>
              </label>
              <select v-model="editingNote.card_id"
                      class="w-full font-mono text-sm px-3 py-1.5 focus:outline-none"
                      style="background: #080808; border: 1px solid #2a2a2a; color: #888;">
                <option :value="null">{{ t('notes.card_none') }}</option>
                <option v-for="c in board.cards" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
            </div>
            <textarea v-model="editingNote.body" rows="5" :placeholder="t('notes.body_placeholder')"
                      class="w-full font-mono text-sm px-3 py-2 focus:outline-none resize-y"
                      style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;"
                      autofocus />
            <div class="flex justify-between items-center">
              <button v-if="editingNote.id" @click="deleteNote(editingNote.id)"
                      class="text-xs font-mono transition-colors delete-btn" style="color: #506858;">
                {{ t('notes.delete') }}
              </button>
              <div v-else />
              <div class="flex gap-4">
                <button @click="editingNote = null"
                        class="text-xs font-mono transition-colors" style="color: #506858;">
                  {{ t('notes.cancel') }}
                </button>
                <button @click="saveNote" :disabled="!editingNote.body.trim() || savingNote"
                        class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-1.5 transition-colors action-btn disabled:opacity-30"
                        style="border: 1px solid #4a7c59; color: #4a7c59;">
                  {{ savingNote ? t('notes.saving') : t('notes.save') }}
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
                {{ t('notes.edit') }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── CHARACTER ─────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'character'">
        <div v-if="character.loading" class="text-xs font-mono" style="color: #506858;">
          {{ t('board.loading') }}
        </div>
        <CharacterSheet v-else :group-id="groupId" :initial-data="character.mySheet?.data ?? null" />
      </template>

      <!-- ─── ARCHIVES ────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'archives'">
        <div v-if="archivesLoading" class="text-xs font-mono" style="color: #506858;">
          {{ t('archives.loading') }}
        </div>
        <div v-else-if="!archives.length" class="text-xs font-mono" style="color: #506858;">
          {{ t('archives.empty') }}
        </div>
        <div v-else class="max-w-3xl space-y-2">
          <div v-for="op in archives" :key="op.id"
               style="border: 1px solid #1a1a1a;">
            <button class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    :style="expandedArchive === op.id ? 'background: #0d0d0d;' : 'background: #080808;'"
                    @click="expandedArchive = expandedArchive === op.id ? null : op.id">
              <span class="flex-1 font-mono truncate" style="color: #c4c4c4;">{{ op.name }}</span>
              <span class="text-xs font-mono shrink-0" style="color: #506858;">
                {{ formatDate(op.archived_at) }}
              </span>
              <svg class="w-4 h-4 transition-transform shrink-0 ml-1"
                   :class="expandedArchive === op.id ? 'rotate-180' : ''"
                   style="color: #2a2a2a;"
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
            <div v-if="expandedArchive === op.id"
                 class="px-6 py-6"
                 style="border-top: 1px solid #1a1a1a; background: #080808;">
              <ArchiveBoard :group-id="groupId" :operation-id="op.id" :is-handler="false" />
            </div>
          </div>
        </div>
      </template>

      <!-- ─── PROFILE ────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'profil'">
        <div class="max-w-sm space-y-6">
          <div>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858;">{{ t('profile.title') }}</p>
            <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
              {{ t('profile.name_label') }}
            </label>
            <input
              v-model="displayName"
              type="text"
              :placeholder="t('profile.name_placeholder')"
              class="w-full font-mono text-sm px-3 py-2 focus:outline-none"
              style="background: #0d0d0d; border: 1px solid #2a2a2a; color: #c4c4c4;"
              @keyup.enter="saveDisplayName"
            />
            <p class="text-xs font-mono mt-2" style="color: #333;">{{ t('profile.name_hint') }}</p>
          </div>
          <div class="flex items-center gap-4">
            <button
              @click="saveDisplayName"
              :disabled="!displayName.trim() || savingName"
              class="text-xs font-mono tracking-[0.15em] uppercase px-4 py-2 transition-colors disabled:opacity-30"
              style="border: 1px solid #4a7c59; color: #4a7c59;"
            >
              {{ savingName ? t('profile.saving') : t('profile.save') }}
            </button>
            <span v-if="nameSaved" class="text-xs font-mono" style="color: #4a7c59;">{{ t('profile.saved') }}</span>
          </div>
        </div>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import ArchiveBoard from '../../components/board/ArchiveBoard.vue'
import { useLang } from '../../composables/useLang'

const { t, locale: i18nLocale } = useI18n()
const { locale, toggleLang } = useLang()

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

// IDs of cards already revealed when the player loaded — don't interrupt for these
const seenRevealedIds = new Set()
let initPhase = true  // true until initial board load is flushed through Vue's watcher

// Primary path: detect reveals via board.cards changes (cards realtime already works)
watch(
  () => board.cards,
  (cards) => {
    for (const card of cards) {
      if (!card.revealed) continue
      if (initPhase) {
        seenRevealedIds.add(card.id)  // initial load — mark as seen, no interrupt
      } else if (!seenRevealedIds.has(card.id)) {
        seenRevealedIds.add(card.id)
        if (!revealQueue.value.includes(card.id)) revealQueue.value.push(card.id)
      }
    }
  }
)

// Secondary path (belt-and-suspenders): via reveal_notifications → lastRevealedId
watch(() => board.lastRevealedId, (cardId) => {
  if (!cardId || initPhase) return
  if (!seenRevealedIds.has(cardId)) {
    seenRevealedIds.add(cardId)
    if (!revealQueue.value.includes(cardId)) revealQueue.value.push(cardId)
  }
})

const tabs = [
  { id: 'board',     labelKey: 'tabs.board' },
  { id: 'visual',    labelKey: 'tabs.visual' },
  { id: 'notes',     labelKey: 'tabs.notes' },
  { id: 'character', labelKey: 'tabs.character' },
  { id: 'profil',    labelKey: 'tabs.profile' },
  { id: 'archives',  labelKey: 'tabs.archives' },
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

// ─── Profile ──────────────────────────────────────────────────────────────────
const displayName = ref(auth.profile?.display_name ?? '')
const savingName = ref(false)
const nameSaved = ref(false)

async function saveDisplayName() {
  if (!displayName.value.trim()) return
  savingName.value = true
  nameSaved.value = false
  await supabase.from('profiles').update({ display_name: displayName.value.trim() }).eq('id', auth.user.id)
  await auth.fetchProfile()
  savingName.value = false
  nameSaved.value = true
  setTimeout(() => { nameSaved.value = false }, 2000)
}

// ─── Archives ────────────────────────────────────────────────────────────────
const archives        = ref([])
const archivesLoading = ref(false)
const expandedArchive = ref(null)

async function loadArchives() {
  archivesLoading.value = true
  const { data } = await supabase
    .from('operations')
    .select('id, name, archived_at, created_at')
    .eq('group_id', groupId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
  archives.value = data ?? []
  archivesLoading.value = false
}

// ─── Settings ───────────────────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await supabase
    .from('group_settings')
    .select('auto_reveal_player_cards')
    .eq('group_id', groupId)
    .single()
  if (data) autoReveal.value = data.auto_reveal_player_cards
}

// ─── Formatting ──────────────────────────────────────────────────────────────
function formatDate(iso) {
  const lang = i18nLocale.value === 'da' ? 'da-DK' : 'en-GB'
  return new Date(iso).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' })
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
watch(activeTab, async (tab) => {
  if (tab === 'notes') loadNotes()
  if (tab === 'character') character.loadMySheet(groupId)
  if (tab === 'profil') displayName.value = auth.profile?.display_name ?? ''
  if (tab === 'archives') await loadArchives()
})

onMounted(async () => {
  await session.loadGroup(groupId)
  await board.loadBoard(groupId, session.currentOperation?.id)
  // Wait for Vue to flush the board.cards watcher (initial load populates seenRevealedIds)
  await nextTick()
  initPhase = false
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
