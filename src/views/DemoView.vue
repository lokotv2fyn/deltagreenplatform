<template>
  <div class="font-mono text-sm"
       style="display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: #0a0a0a; color: #c4c4c4;">

    <!-- Demo banner -->
    <div class="px-4 py-2 text-xs text-center tracking-widest uppercase"
         style="flex-shrink: 0; background: #150a00; border-bottom: 1px solid #3d1c00; color: #d97706;">
      Demo · read-only preview · no data is saved ·
      <router-link to="/login" class="underline" style="color: #d97706;"
                   onmouseenter="this.style.color='#fbbf24'"
                   onmouseleave="this.style.color='#d97706'">
        sign in
      </router-link>
      to run your own campaign
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3"
         style="flex-shrink: 0; border-bottom: 1px solid #1a1a1a;">
      <div class="flex items-center gap-3">
        <span class="text-xs tracking-[0.2em] uppercase" style="color: #3d6b4a;">Delta Green</span>
        <span style="color: #2a2a2a;">//</span>
        <span class="text-xs tracking-[0.15em] uppercase" style="color: #506858;">Handler</span>
      </div>
      <div class="flex items-center gap-3 text-xs" style="color: #2a3a2e;">
        <span>Operation Crimson Dusk</span>
        <span class="px-2 py-0.5 text-xs" style="background: #0d1a0d; color: #3d6b4a; border: 1px solid #1a2e1a;">● Active</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 px-5"
         style="flex-shrink: 0; border-bottom: 1px solid #111;">
      <button v-for="tab in tabs" :key="tab.id"
              @click="activeTab = tab.id"
              class="px-3 py-2.5 text-xs tracking-[0.15em] uppercase transition-colors"
              :style="activeTab === tab.id
                ? 'color: #c4c4c4; border-bottom: 2px solid #3d6b4a; margin-bottom: -1px;'
                : 'color: #2a3a2e; border-bottom: 2px solid transparent; margin-bottom: -1px;'">
        {{ tab.label }}
      </button>
      <span class="ml-auto text-xs py-2.5" style="color: #2a2a2a;">
        {{ demoCards.length }} cards · 3 agents
      </span>
    </div>

    <!-- ── BOARD TAB ──────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'board'" class="overflow-y-auto" style="flex: 1;">
      <div class="px-5 py-5 max-w-2xl mx-auto space-y-8">

        <!-- Red thread -->
        <div v-if="chain.length" class="space-y-2">
          <div class="flex items-center gap-3">
            <span class="text-xs tracking-[0.2em] uppercase" style="color: #dc2626;">Red Thread</span>
            <span class="text-xs" style="color: #2a2a2a;">{{ chain.length }} links</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
            <template v-for="(link, i) in chain" :key="link.id">
              <span style="color: #dc2626;">{{ link.position }}.</span>
              <span class="mx-1" style="color: #888888;">{{ link.label }}</span>
              <span v-if="i < chain.length - 1" style="color: #2a2a2a;">→</span>
            </template>
          </div>
        </div>

        <!-- On board -->
        <div class="space-y-1">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-xs tracking-[0.2em] uppercase" style="color: #506858;">On Board</h2>
            <span class="text-xs" style="color: #2a2a2a;">{{ onBoard.length }}</span>
          </div>
          <DemoCard
            v-for="card in onBoard"
            :key="card.id"
            :card="card"
            :chain-pos="chainPos(card.id)"
          />
        </div>

        <!-- In deck -->
        <div class="space-y-1">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-xs tracking-[0.2em] uppercase" style="color: #506858;">In Deck</h2>
            <span class="text-xs" style="color: #2a2a2a;">{{ inDeck.length }}</span>
          </div>
          <DemoCard
            v-for="card in inDeck"
            :key="card.id"
            :card="card"
            :chain-pos="chainPos(card.id)"
          />
        </div>

      </div>
    </div>

    <!-- ── VISUAL TAB ─────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'visual'" style="flex: 1; overflow: hidden;">
      <VisualBoard
        group-id="demo"
        :is-handler="true"
        :can-edit="false"
      />
    </div>

    <!-- ── AGENTS TAB ─────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'agents'" class="overflow-y-auto" style="flex: 1;">
      <div class="px-5 py-5 max-w-3xl mx-auto space-y-2">
        <div v-for="agent in demoAgents" :key="agent.id"
             style="border: 1px solid #1a1a1a;">

          <!-- Accordion header -->
          <button class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  :style="openAgent === agent.id ? 'background: #0d0d0d;' : 'background: #0a0a0a;'"
                  @click="openAgent = openAgent === agent.id ? null : agent.id">
            <span class="text-xs tracking-[0.15em] uppercase shrink-0" style="color: #3d6b4a;">Agent</span>
            <span class="flex-1 font-mono truncate" style="color: #c4c4c4;">{{ agent.data.name }}</span>
            <span class="text-xs shrink-0" style="color: #2a3a2e;">{{ agent.player }} · {{ agent.data.profession }}</span>
            <span class="text-xs font-mono shrink-0 ml-2" style="color: #506858;">SAN {{ agent.data.sanCurrent }}</span>
            <svg class="w-4 h-4 transition-transform shrink-0 ml-1"
                 :class="openAgent === agent.id ? 'rotate-180' : ''"
                 style="color: #2a2a2a;"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>

          <!-- Character sheet -->
          <div v-if="openAgent === agent.id"
               class="px-6 py-6"
               style="border-top: 1px solid #1a1a1a; background: #080808;">
            <CharacterSheet
              group-id="demo"
              :initial-data="agent.data"
              :readonly="true"
            />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/board'
import DemoCard from '../components/demo/DemoCard.vue'
import VisualBoard from '../components/board/VisualBoard.vue'
import CharacterSheet from '../components/CharacterSheet.vue'

const board = useBoardStore()

// ─── Tabs ─────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'board',  label: 'Board'  },
  { id: 'visual', label: 'Visual' },
  { id: 'agents', label: 'Agents' },
]
const activeTab = ref('board')
const openAgent = ref(null)

// ─── Board tab — local list data ──────────────────────────────────────────
const demoCards = [
  {
    id: 'd1', type: 'briefing', label: 'Operation Crimson Dusk',
    revealed: true, minimized: false,
    data: {
      heading: 'OPERATION CRIMSON DUSK',
      stamp: 'TOP SECRET // DELTA GREEN',
      body: 'Three researchers at Miskatonic University have vanished. Local PD closed the case as a hiking accident within 48 hours. ||The bodies were found arranged in a 17-point pattern matching symbols from the Voynich Manuscript.|| Cover: FBI missing persons unit. Lethal force authorised.',
    },
  },
  {
    id: 'd2', type: 'npc', label: 'Dr. Eleanor Marsh',
    revealed: true, minimized: false,
    data: {
      name: 'Dr. Eleanor Marsh',
      role: 'Lead Researcher, Dept. of Anthropology',
      affiliations: ['Miskatonic University', 'STATUS: MISSING'],
      notes: 'Last seen Thursday evening. Office found ransacked. ||All research files for Project SABLE removed — no digital backup exists.||',
    },
  },
  {
    id: 'd3', type: 'bevis', label: 'Exhibit A — Field Journal',
    revealed: true, minimized: false,
    data: {
      exhibitNumber: 'A-01',
      foundAt: "Marsh's office, locked desk drawer",
      description: 'Partial field journal. Last entry dated Nov 3rd. Pages 14–22 torn out cleanly — no residue on binding.',
      analysis: '||Soil trace on cover matches GPS coordinates 41.7°N 70.4°W — remote woodland, 40 miles from campus. No roads within 6 miles.||',
    },
  },
  {
    id: 'd4', type: 'comms', label: 'SMS — Unknown Number',
    revealed: true, minimized: false,
    data: {
      sender: '+1 (508) 000-0000',
      message: "They found it. Don't come to the site. Destroy this.",
      time: 'Thu 03 Nov, 23:47',
    },
  },
  {
    id: 'd5', type: 'unnatural', label: 'The Arrangement',
    revealed: false, minimized: true,
    data: {
      title: 'The Arrangement',
      sanCost: '1/1d8 SAN',
      body: '||Seventeen symbols carved into living trees forming a 40-metre circle. Symbols predate any known writing system by an estimated 4,000 years. Direct exposure causes acute disorientation, tinnitus and paranoia lasting 24–72 hours. Two of the researchers sketched partial copies — both are now missing.||',
    },
  },
  {
    id: 'd6', type: 'npc', label: 'Sheriff Tom Briggs',
    revealed: true, minimized: true,
    data: {
      name: 'Sheriff Tom Briggs',
      role: 'Arkham County Sheriff',
      affiliations: ['Arkham County PD'],
      notes: "Cooperative but territorial. Closed the case in 48 hours without interviewing the university. ||Has visited the site three times since the disappearance — no log entries exist for any visit.||",
    },
  },
  {
    id: 'd7', type: 'bevis', label: 'Exhibit B — Soil Sample',
    revealed: true, minimized: true,
    data: {
      exhibitNumber: 'B-01',
      foundAt: "Boot of Marsh's car, Miskatonic campus car park",
      description: 'Dark soil, almost no organic matter. Unusually cold to the touch at room temperature. No match to any soil profile within 200 miles.',
      analysis: 'Lab analysis pending — sample resists standard classification.',
    },
  },
]

const chain = [
  { id: 'c1', card_id: 'd2', position: 1, label: 'Dr. Eleanor Marsh' },
  { id: 'c2', card_id: 'd3', position: 2, label: 'Exhibit A — Field Journal' },
  { id: 'c3', card_id: 'd4', position: 3, label: 'SMS — Unknown Number' },
]

const onBoard = computed(() => demoCards.filter(c => !c.minimized))
const inDeck  = computed(() => demoCards.filter(c => c.minimized))

function chainPos(cardId) {
  return chain.find(l => l.card_id === cardId)?.position ?? null
}

// ─── Visual tab — board store data ────────────────────────────────────────
// _groupId stays null in the store (we never call loadBoard), so all write
// methods return early after their optimistic updates — no Supabase calls.
const storeDemoCards = [
  {
    id: 'd1', group_id: 'demo', type: 'briefing', label: 'Operation Crimson Dusk',
    revealed: true, origin: 'handler', created_by: 'demo',
    card_positions: [{ minimized: false, x: 60, y: 80 }],
    data: {
      heading: 'OPERATION CRIMSON DUSK',
      stamp: 'TOP SECRET // DELTA GREEN',
      body: 'Three researchers at Miskatonic University have vanished. Local PD closed the case as a hiking accident within 48 hours. ||The bodies were found arranged in a 17-point pattern matching symbols from the Voynich Manuscript.|| Cover: FBI missing persons unit. Lethal force authorised.',
    },
  },
  {
    id: 'd2', group_id: 'demo', type: 'npc', label: 'Dr. Eleanor Marsh',
    revealed: true, origin: 'handler', created_by: 'demo',
    card_positions: [{ minimized: false, x: 340, y: 75 }],
    data: {
      name: 'Dr. Eleanor Marsh',
      role: 'Lead Researcher, Dept. of Anthropology',
      affiliations: ['Miskatonic University', 'STATUS: MISSING'],
      notes: 'Last seen Thursday evening. Office found ransacked. ||All research files for Project SABLE removed — no digital backup exists.||',
    },
  },
  {
    id: 'd3', group_id: 'demo', type: 'bevis', label: 'Exhibit A — Field Journal',
    revealed: true, origin: 'handler', created_by: 'demo',
    card_positions: [{ minimized: false, x: 620, y: 80 }],
    data: {
      exhibitNumber: 'A-01',
      foundAt: "Marsh's office, locked desk drawer",
      description: 'Partial field journal. Last entry dated Nov 3rd. Pages 14–22 torn out cleanly — no residue on binding.',
      analysis: '||Soil trace on cover matches GPS coordinates 41.7°N 70.4°W — remote woodland, 40 miles from campus. No roads within 6 miles.||',
    },
  },
  {
    id: 'd4', group_id: 'demo', type: 'comms', label: 'SMS — Unknown Number',
    revealed: true, origin: 'handler', created_by: 'demo',
    card_positions: [{ minimized: false, x: 450, y: 270 }],
    data: {
      sender: '+1 (508) 000-0000',
      message: "They found it. Don't come to the site. Destroy this.",
      time: 'Thu 03 Nov, 23:47',
    },
  },
  {
    id: 'd5', group_id: 'demo', type: 'unnatural', label: 'The Arrangement',
    revealed: false, origin: 'handler', created_by: 'demo',
    card_positions: [{ minimized: false, x: 180, y: 270 }],
    data: {
      title: 'The Arrangement',
      sanCost: '1/1d8 SAN',
      body: '||Seventeen symbols carved into living trees forming a 40-metre circle. Symbols predate any known writing system by an estimated 4,000 years. Direct exposure causes acute disorientation, tinnitus and paranoia lasting 24–72 hours.||',
    },
  },
]

const storeDemoChainLinks = [
  { id: 'c1', group_id: 'demo', card_id: 'd2', position: 1 },
  { id: 'c2', group_id: 'demo', card_id: 'd3', position: 2 },
  { id: 'c3', group_id: 'demo', card_id: 'd4', position: 3 },
]

onMounted(() => {
  board.$patch({
    cards: storeDemoCards,
    chainLinks: storeDemoChainLinks,
    chainVisible: true,
  })
})

onUnmounted(() => {
  board.reset()
})

// ─── Agents tab ───────────────────────────────────────────────────────────
const demoAgents = [
  {
    id: 'a1',
    player: 'Anne',
    data: {
      name: 'Margaret Harker',
      age: '38',
      profession: 'Special Agent',
      employer: 'Federal Bureau of Investigation',
      nationality: 'American',
      stats: { str: 10, con: 12, dex: 13, int: 15, pow: 11, cha: 12 },
      hpCurrent: 11,
      wpCurrent: 11,
      sanCurrent: 48,
      skills: {
        alertness: 50, athletics: 40, bureaucracy: 40,
        criminology: 45, drive: 40, firearms: 55,
        humint: 60, law: 45, persuade: 50, search: 45,
      },
      bonds: [
        { name: 'David Harker (ex-husband)', score: 4 },
        { name: 'Sarah Okonjo (Bureau partner)', score: 5 },
      ],
      notes: '2 years with the Program. Former Organized Crime unit, Boston field office. Cleared for Majestic-level briefings.',
    },
  },
  {
    id: 'a2',
    player: 'Andreas',
    data: {
      name: 'Dr. Thomas Webb',
      age: '44',
      profession: 'Medical Examiner',
      employer: 'Commonwealth of Massachusetts',
      nationality: 'American',
      stats: { str: 9, con: 10, dex: 11, int: 17, pow: 12, cha: 10 },
      hpCurrent: 9,
      wpCurrent: 12,
      sanCurrent: 52,
      skills: {
        alertness: 35, firstAid: 50, forensics: 65,
        humint: 40, medicine: 70, pharmacy: 35, search: 50,
      },
      bonds: [
        { name: 'Claire Webb (daughter)', score: 6 },
        { name: 'Dr. Kenji Yamamoto (colleague)', score: 3 },
      ],
      notes: 'Chief Medical Examiner, Boston. Recruited after the Portland incident, 2022. No prior combat training. Invaluable in the morgue.',
    },
  },
  {
    id: 'a3',
    player: 'Martin',
    data: {
      name: 'Victor Solano',
      age: '41',
      profession: 'Intelligence Officer',
      employer: 'Defense Intelligence Agency',
      nationality: 'American',
      stats: { str: 12, con: 13, dex: 12, int: 14, pow: 10, cha: 11 },
      hpCurrent: 12,
      wpCurrent: 10,
      sanCurrent: 41,
      skills: {
        alertness: 50, athletics: 40, bureaucracy: 45,
        criminology: 55, firearms: 45, humint: 50,
        sigint: 60, stealth: 50, survival: 30,
        foreignLanguage: 55, foreignLanguageSpecify: 'Arabic, Farsi',
      },
      bonds: [
        { name: 'Elena Solano (sister)', score: 5 },
        { name: 'James Kowalski (former handler)', score: 4 },
      ],
      notes: '12 years DIA. Arabic and Farsi speaker. Clearance: TS/SCI. Losing ground fast after the Kandahar affair.',
    },
  },
]
</script>
