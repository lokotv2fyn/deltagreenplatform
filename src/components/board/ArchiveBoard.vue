<template>
  <div>
    <div v-if="loading" class="text-xs font-mono" style="color: #506858;">
      {{ t('archives.loading') }}
    </div>

    <div v-else>
      <!-- Chain summary -->
      <div v-if="chain.length" class="mb-6">
        <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">{{ t('chain.title') }}</p>
        <div class="space-y-1">
          <div v-for="link in chain" :key="link.id" class="flex items-center gap-3 text-xs font-mono">
            <span class="tabular-nums shrink-0" style="color: #dc2626;">{{ link.position }}</span>
            <span style="color: #888;">{{ link.card?.label }}</span>
          </div>
        </div>
      </div>

      <section v-if="onBoard.length" class="mb-8">
        <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">{{ t('board.on_table') }}</p>
        <div class="space-y-1">
          <CardItem v-for="card in onBoard" :key="card.id"
                    :card="card" :is-handler="isHandler" :can-edit-chain="false" :readonly="true" />
        </div>
      </section>

      <section v-if="inDeck.length">
        <p class="text-xs font-mono tracking-[0.2em] uppercase mb-3" style="color: #506858;">{{ t('board.in_deck') }}</p>
        <div class="space-y-1">
          <CardItem v-for="card in inDeck" :key="card.id"
                    :card="card" :is-handler="isHandler" :can-edit-chain="false" :readonly="true" />
        </div>
      </section>

      <div v-if="!cards.length" class="text-xs font-mono" style="color: #506858;">
        {{ t('board.empty_handler') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '../../lib/supabase'
import CardItem from './CardItem.vue'

const { t } = useI18n()

const props = defineProps({
  groupId:     { type: String, required: true },
  operationId: { type: String, required: true },
  isHandler:   { type: Boolean, default: false },
})

const cards      = ref([])
const chainLinks = ref([])
const loading    = ref(false)

const onBoard = computed(() => cards.value.filter(c => c.revealed))
const inDeck  = computed(() => cards.value.filter(c => !c.revealed))

const chain = computed(() =>
  [...chainLinks.value]
    .sort((a, b) => a.position - b.position)
    .map(link => ({ ...link, card: cards.value.find(c => c.id === link.card_id) }))
    .filter(l => l.card)
)

onMounted(async () => {
  loading.value = true
  const [cardsRes, chainRes] = await Promise.all([
    supabase.from('cards')
      .select('*, card_positions(*)')
      .eq('group_id', props.groupId)
      .eq('operation_id', props.operationId)
      .order('created_at'),
    supabase.from('chain_links')
      .select('*')
      .eq('group_id', props.groupId)
      .eq('operation_id', props.operationId)
      .order('position'),
  ])
  cards.value      = cardsRes.data ?? []
  chainLinks.value = chainRes.data ?? []
  loading.value    = false
})
</script>
