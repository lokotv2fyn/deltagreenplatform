<template>
  <div class="min-h-screen font-mono text-sm" style="background: #0a0a0a; color: #c4c4c4;">

    <!-- Demo banner -->
    <div class="px-4 py-2 text-xs text-center tracking-widest uppercase"
         style="background: #150a00; border-bottom: 1px solid #3d1c00; color: #d97706;">
      Demo · read-only preview · no data is saved ·
      <router-link to="/login" class="underline" style="color: #d97706;"
                   onmouseenter="this.style.color='#fbbf24'"
                   onmouseleave="this.style.color='#d97706'">
        sign in
      </router-link>
      to run your own campaign
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3" style="border-bottom: 1px solid #1a1a1a;">
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

    <!-- Info bar -->
    <div class="flex items-center gap-4 px-5 py-2 text-xs" style="border-bottom: 1px solid #111; color: #2a3a2e;">
      <span>{{ demoCards.length }} cards</span>
      <span>· {{ onBoard.length }} on board</span>
      <span class="ml-auto" style="color: #506858;">3 agents connected</span>
    </div>

    <!-- Content -->
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
</template>

<script setup>
import { computed } from 'vue'
import DemoCard from '../components/demo/DemoCard.vue'

const demoCards = [
  // ── On board ──────────────────────────────────────────────────
  {
    id: 'd1',
    type: 'briefing',
    label: 'Operation Crimson Dusk',
    revealed: true,
    minimized: false,
    data: {
      heading: 'OPERATION CRIMSON DUSK',
      stamp: 'TOP SECRET // DELTA GREEN',
      body: 'Three researchers at Miskatonic University have vanished. Local PD closed the case as a hiking accident within 48 hours. ||The bodies were found arranged in a 17-point pattern matching symbols from the Voynich Manuscript.|| Cover: FBI missing persons unit. Lethal force authorised.',
    },
  },
  {
    id: 'd2',
    type: 'npc',
    label: 'Dr. Eleanor Marsh',
    revealed: true,
    minimized: false,
    data: {
      name: 'Dr. Eleanor Marsh',
      role: 'Lead Researcher, Dept. of Anthropology',
      affiliations: ['Miskatonic University', 'STATUS: MISSING'],
      notes: 'Last seen Thursday evening. Office found ransacked. ||All research files for Project SABLE removed — no digital backup exists.||',
    },
  },
  {
    id: 'd3',
    type: 'bevis',
    label: 'Exhibit A — Field Journal',
    revealed: true,
    minimized: false,
    data: {
      exhibitNumber: 'A-01',
      foundAt: "Marsh's office, locked desk drawer",
      description: "Partial field journal. Last entry dated Nov 3rd. Pages 14–22 torn out cleanly — no residue on binding.",
      analysis: "||Soil trace on cover matches GPS coordinates 41.7°N 70.4°W — remote woodland, 40 miles from campus. No roads within 6 miles.||",
    },
  },
  {
    id: 'd4',
    type: 'comms',
    label: 'SMS — Unknown Number',
    revealed: true,
    minimized: false,
    data: {
      sender: '+1 (508) 000-0000',
      message: "They found it. Don't come to the site. Destroy this.",
      time: 'Thu 03 Nov, 23:47',
    },
  },
  // ── In deck ───────────────────────────────────────────────────
  {
    id: 'd5',
    type: 'unnatural',
    label: 'The Arrangement',
    revealed: false,
    minimized: true,
    data: {
      title: 'The Arrangement',
      sanCost: '1/1d8 SAN',
      body: '||Seventeen symbols carved into living trees forming a 40-metre circle. Symbols predate any known writing system by an estimated 4,000 years. Direct exposure causes acute disorientation, tinnitus and paranoia lasting 24–72 hours. Two of the researchers sketched partial copies — both are now missing.||',
    },
  },
  {
    id: 'd6',
    type: 'npc',
    label: 'Sheriff Tom Briggs',
    revealed: true,
    minimized: true,
    data: {
      name: 'Sheriff Tom Briggs',
      role: 'Arkham County Sheriff',
      affiliations: ['Arkham County PD'],
      notes: "Cooperative but territorial. Closed the case in 48 hours without interviewing the university. ||Has visited the site three times since the disappearance — no log entries exist for any visit.||",
    },
  },
  {
    id: 'd7',
    type: 'bevis',
    label: 'Exhibit B — Soil Sample',
    revealed: true,
    minimized: true,
    data: {
      exhibitNumber: 'B-01',
      foundAt: "Boot of Marsh's car, Miskatonic campus car park",
      description: "Dark soil, almost no organic matter. Unusually cold to the touch at room temperature. No match to any soil profile within 200 miles.",
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
</script>
