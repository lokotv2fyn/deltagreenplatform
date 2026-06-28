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
      <span class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #92400e;">{{ t('handler.role') }}</span>

      <div class="ml-auto flex items-center gap-3">
        <span v-if="session.currentSession" class="text-xs font-mono tracking-wider"
              :style="session.isActive ? 'color: #4a7c59;' : 'color: #92400e;'">
          {{ session.isActive ? t('session.active') : t('session.paused') }}
          <span v-if="session.currentSession.label" class="ml-1" style="color: #506858;">
            {{ session.currentSession.label }}
          </span>
        </span>
        <span v-else class="text-xs font-mono tracking-wider" style="color: #506858;">{{ t('session.none') }}</span>

        <button v-if="!session.currentSession || session.isPaused"
                @click="promptStartSession"
                class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1 transition-colors session-btn-start"
                style="border: 1px solid #1f4a2a; color: #4a7c59;">
          {{ t('session.start') }}
        </button>
        <button v-if="session.isActive"
                @click="doStopSession"
                class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1 transition-colors session-btn-stop"
                style="border: 1px solid #2a2a2a; color: #5e8068;">
          {{ t('session.stop') }}
        </button>

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

    <!-- Content -->
    <div class="flex-1" :class="activeTab === 'visual' ? 'overflow-hidden' : 'overflow-auto p-6'">

      <!-- ─── VISUAL ──────────────────────────────────────────────────── -->
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
            {{ t('board.card_count', { n: board.cards.length }) }}
            <span v-if="board.onBoard.length" style="color: #506858;">
              {{ t('board.on_table_count', { n: board.onBoard.length }) }}
            </span>
          </p>
          <button @click="showCreate = true"
                  class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                  style="border: 1px solid #2a2a2a; color: #5e8068;">
            {{ t('board.create') }}
          </button>
        </div>

        <div v-if="board.loading" class="text-xs font-mono tracking-wider" style="color: #506858;">
          {{ t('board.loading') }}
        </div>

        <div v-else>
          <TheChain :is-handler="true" :can-edit="true" />

          <section v-if="board.onBoard.length" class="mb-8">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">
              {{ t('board.on_table') }}
            </p>
            <div class="space-y-1">
              <CardItem v-for="card in board.onBoard" :key="card.id"
                        :card="card" :is-handler="true" :can-edit-chain="true" />
            </div>
          </section>

          <section v-if="board.inDeck.length">
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">
              {{ t('board.in_deck') }}
            </p>
            <div class="space-y-1">
              <CardItem v-for="card in board.inDeck" :key="card.id"
                        :card="card" :is-handler="true" :can-edit-chain="true" />
            </div>
          </section>

          <div v-if="!board.cards.length" class="text-xs font-mono" style="color: #506858;">
            {{ t('board.empty_handler') }}
          </div>
        </div>
      </template>

      <!-- ─── AGENTS ──────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'agents'">
        <div v-if="character.loading" class="text-xs font-mono" style="color: #506858;">
          {{ t('agents.loading') }}
        </div>
        <div v-else-if="!character.allSheets.length" class="text-xs font-mono" style="color: #506858;">
          {{ t('agents.empty') }}
        </div>
        <div v-else class="max-w-3xl space-y-2">
          <div v-for="agent in character.allSheets" :key="agent.userId"
               style="border: 1px solid #1a1a1a;">

            <!-- Accordion header -->
            <button class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    :style="selectedAgent === agent.userId ? 'background: #0d0d0d;' : 'background: #080808;'"
                    @click="selectedAgent = selectedAgent === agent.userId ? null : agent.userId">
              <span class="text-xs tracking-[0.15em] uppercase shrink-0" style="color: #3d6b4a;">Agent</span>
              <span class="flex-1 font-mono truncate" style="color: #c4c4c4;">
                {{ agent.sheet?.data?.name || agent.displayName }}
              </span>
              <span class="text-xs shrink-0" style="color: #2a3a2e;">{{ agent.displayName }}</span>
              <span v-if="agentSAN(agent.sheet) != null"
                    class="text-xs font-mono shrink-0 ml-2" style="color: #506858;">
                SAN {{ agentSAN(agent.sheet) }}
              </span>
              <svg class="w-4 h-4 transition-transform shrink-0 ml-1"
                   :class="selectedAgent === agent.userId ? 'rotate-180' : ''"
                   style="color: #2a2a2a;"
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>

            <!-- Character sheet -->
            <div v-if="selectedAgent === agent.userId"
                 class="px-6 py-6"
                 style="border-top: 1px solid #1a1a1a; background: #080808;">
              <p v-if="!agent.sheet" class="text-xs font-mono" style="color: #506858;">
                {{ t('agents.no_sheet', { name: agent.displayName }) }}
              </p>
              <CharacterSheet v-else :group-id="groupId" :initial-data="agent.sheet.data" :readonly="true" />
            </div>
          </div>
        </div>
      </template>

      <!-- ─── PLAYER NOTES ──────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'notes'">
        <div v-if="notesLoading" class="text-xs font-mono" style="color: #506858;">{{ t('notes.handler_loading') }}</div>
        <div v-else-if="!notes.length" class="text-xs font-mono" style="color: #506858;">{{ t('notes.handler_empty') }}</div>
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

      <!-- ─── ACTIVITY ──────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'activity'">
        <div v-if="activityLoading" class="text-xs font-mono" style="color: #506858;">{{ t('activity.loading') }}</div>
        <div v-else-if="!activity.length" class="text-xs font-mono" style="color: #506858;">{{ t('activity.empty') }}</div>
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

      <!-- ─── SETTINGS ─────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'settings'">
        <div class="max-w-md space-y-10">

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              {{ t('settings.invite_title') }}
            </p>
            <div v-if="inviteCode" class="space-y-2">
              <div class="flex items-center gap-2">
                <code class="flex-1 px-3 py-2 text-xs font-mono select-all"
                      style="background: #0d0d0d; border: 1px solid #1a1a1a; color: #888;">
                  {{ inviteUrl }}
                </code>
                <button @click="copyInvite"
                        class="text-xs font-mono px-3 py-2 transition-colors action-btn shrink-0"
                        style="border: 1px solid #2a2a2a; color: #5e8068;">
                  {{ copied ? t('settings.copied') : t('settings.copy') }}
                </button>
              </div>
              <p v-if="inviteExpiresAt" class="text-xs font-mono" style="color: #506858;">
                {{ t('settings.expires', { date: formatDate(inviteExpiresAt) }) }}
              </p>
              <button @click="regenerateInvite"
                      class="text-xs font-mono transition-colors action-btn-text"
                      style="color: #506858;">
                {{ t('settings.regenerate') }}
              </button>
            </div>
          </section>

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              {{ t('settings.player_cards_title') }}
            </p>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="autoReveal" @change="saveAutoReveal" class="accent-neutral-600 w-3.5 h-3.5" />
              <span class="text-sm font-mono" style="color: #888;">{{ t('settings.auto_reveal_label') }}</span>
            </label>
            <p class="text-xs font-mono mt-1 ml-6" style="color: #506858;">
              {{ t('settings.auto_reveal_hint') }}
            </p>
          </section>

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              {{ t('settings.group_name_title') }}
            </p>
            <input v-model="groupName" type="text"
                   class="w-full font-mono text-sm px-3 py-2 focus:outline-none mb-2"
                   style="background: #0d0d0d; border: 1px solid #1a1a1a; color: #c4c4c4;"
                   :placeholder="t('settings.group_name_placeholder')" />
            <button @click="saveName"
                    class="text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                    style="border: 1px solid #2a2a2a; color: #5e8068;">
              {{ t('settings.save') }}
            </button>
          </section>

          <section>
            <p class="text-xs font-mono tracking-[0.2em] uppercase mb-4" style="color: #506858; border-bottom: 1px solid #1a1a1a; padding-bottom: 0.5rem;">
              {{ t('settings.group_desc_title') }}
            </p>
            <textarea v-model="groupDescription" rows="3"
                      class="w-full font-mono text-sm px-3 py-2 focus:outline-none resize-none"
                      style="background: #0d0d0d; border: 1px solid #1a1a1a; color: #c4c4c4;"
                      :placeholder="t('settings.group_desc_placeholder')" />
            <button @click="saveDescription"
                    class="mt-2 text-xs font-mono tracking-[0.1em] uppercase px-3 py-1.5 transition-colors action-btn"
                    style="border: 1px solid #2a2a2a; color: #5e8068;">
              {{ t('settings.save') }}
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
          <p class="text-xs font-mono tracking-[0.25em] uppercase mb-1" style="color: #506858;">
            {{ t('session.dialog_label') }}
          </p>
          <h2 class="text-sm font-mono" style="color: #c4c4c4;">{{ t('session.dialog_title') }}</h2>
        </div>
        <div class="px-6 py-5">
          <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
            {{ t('session.session_label') }} <span style="color: #3a5040;">{{ t('dashboard.optional') }}</span>
          </label>
          <input v-model="sessionLabel" type="text" :placeholder="t('session.session_placeholder')"
                 class="w-full font-mono text-sm px-3 py-2 focus:outline-none"
                 style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;" />
        </div>
        <div class="px-6 py-4 flex justify-end gap-4" style="border-top: 1px solid #1a1a1a;">
          <button @click="showStartDialog = false"
                  class="text-xs font-mono tracking-[0.1em] uppercase transition-colors"
                  style="color: #506858;">
            {{ t('session.cancel') }}
          </button>
          <button @click="doStartSession"
                  class="text-xs font-mono tracking-[0.1em] uppercase px-4 py-2 transition-colors session-btn-start"
                  style="border: 1px solid #1f4a2a; color: #4a7c59;">
            {{ t('session.start_btn') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '../../lib/supabase'
import { useSessionStore } from '../../stores/session'
import { useBoardStore } from '../../stores/board'
import CardItem from '../../components/board/CardItem.vue'
import CreateCardModal from '../../components/board/CreateCardModal.vue'
import TheChain from '../../components/board/TheChain.vue'
import CharacterSheet from '../../components/CharacterSheet.vue'
import { useCharacterStore } from '../../stores/character'
import VisualBoard from '../../components/board/VisualBoard.vue'
import { useLang } from '../../composables/useLang'

const { t, locale: i18nLocale } = useI18n()
const { locale, toggleLang } = useLang()

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
  { id: 'board',    labelKey: 'tabs.board' },
  { id: 'visual',   labelKey: 'tabs.visual' },
  { id: 'agents',   labelKey: 'tabs.agents' },
  { id: 'notes',    labelKey: 'tabs.player_notes' },
  { id: 'activity', labelKey: 'tabs.activity' },
  { id: 'settings', labelKey: 'tabs.settings' },
]

// ─── Notes ───────────────────────────────────────────────────────────────────
const notes = ref([])
const notesLoading = ref(false)

const notesByAuthor = computed(() => {
  const grouped = {}
  for (const n of notes.value) {
    const name = n.author?.display_name ?? t('notes.unknown_author')
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

function actionLabel(action) {
  return t(`activity.actions.${action}`, action)
}

// ─── Settings ────────────────────────────────────────────────────────────────
const autoReveal = ref(true)
const groupName = ref('')
const groupDescription = ref('')
const copied = ref(false)
const inviteCode = ref('')
const inviteExpiresAt = ref(null)

const inviteUrl = computed(() =>
  inviteCode.value
    ? `${window.location.origin}/join/${inviteCode.value}`
    : ''
)

async function loadInviteData() {
  const { data } = await supabase.rpc('get_invite_code', { group_id: groupId })
  if (data?.[0]) {
    inviteCode.value = data[0].invite_code ?? ''
    inviteExpiresAt.value = data[0].invite_expires_at ?? null
  }
}

async function loadSettings() {
  const { data } = await supabase
    .from('group_settings')
    .select('auto_reveal_player_cards')
    .eq('group_id', groupId)
    .single()
  if (data) autoReveal.value = data.auto_reveal_player_cards
  groupName.value = session.group?.name ?? ''
  groupDescription.value = session.group?.description ?? ''
  await loadInviteData()
}

async function saveAutoReveal() {
  await supabase
    .from('group_settings')
    .update({ auto_reveal_player_cards: autoReveal.value })
    .eq('group_id', groupId)
}

async function saveName() {
  if (!groupName.value.trim()) return
  await supabase.from('groups').update({ name: groupName.value.trim() }).eq('id', groupId)
  await session.loadGroup(groupId)
}

async function saveDescription() {
  await supabase.from('groups').update({ description: groupDescription.value }).eq('id', groupId)
}

async function regenerateInvite() {
  const { data } = await supabase.rpc('regenerate_invite_code', { group_id: groupId })
  if (data?.[0]) {
    inviteCode.value = data[0].invite_code ?? ''
    inviteExpiresAt.value = data[0].invite_expires_at ?? null
  }
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

// ─── Agents ──────────────────────────────────────────────────────────────────
function agentSAN(sheet) {
  const d = sheet?.data
  if (!d) return null
  if (d.sanCurrent != null) return d.sanCurrent
  if (d.stats?.pow != null) return d.stats.pow * 5
  return null
}

// ─── Formatting ──────────────────────────────────────────────────────────────
function formatDate(iso) {
  const lang = i18nLocale.value === 'da' ? 'da-DK' : 'en-GB'
  return new Date(iso).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' })
}
function formatTime(iso) {
  const lang = i18nLocale.value === 'da' ? 'da-DK' : 'en-GB'
  return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

// ─── Watch tab changes ───────────────────────────────────────────────────────
watch(activeTab, async (tab) => {
  if (tab === 'notes') loadNotes()
  if (tab === 'activity') loadActivity()
  if (tab === 'settings') loadSettings()
  if (tab === 'agents') {
    await character.loadAllSheets(groupId)
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
