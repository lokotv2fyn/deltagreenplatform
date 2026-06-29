import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

function getPos(card) {
  const p = card.card_positions
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

export const useBoardStore = defineStore('board', () => {
  const cards = ref([])
  const chainLinks = ref([])
  const chainVisible = ref(true)
  const loading = ref(false)
  const lastRevealedId = ref(null)
  let _groupId = null
  let _operationId = null
  let channel = null

  const onBoard = computed(() => cards.value.filter(c => c.revealed))
  const inDeck  = computed(() => cards.value.filter(c => !c.revealed))

  const chain = computed(() =>
    [...chainLinks.value]
      .sort((a, b) => a.position - b.position)
      .map(link => ({ ...link, card: cards.value.find(c => c.id === link.card_id) }))
      .filter(l => l.card)
  )

  function isInChain(cardId) {
    return chainLinks.value.some(l => l.card_id === cardId)
  }

  function getChainPosition(cardId) {
    return chainLinks.value.find(l => l.card_id === cardId)?.position
  }

  async function loadBoard(groupId, operationId) {
    _groupId = groupId
    _operationId = operationId ?? null
    loading.value = true
    let cardsQ = supabase.from('cards').select('*, card_positions(*)').eq('group_id', groupId).order('created_at')
    let chainQ = supabase.from('chain_links').select('*').eq('group_id', groupId).order('position')
    if (_operationId) {
      cardsQ = cardsQ.eq('operation_id', _operationId)
      chainQ = chainQ.eq('operation_id', _operationId)
    }
    const [cardsRes, chainRes, chainStateRes] = await Promise.all([
      cardsQ,
      chainQ,
      supabase.from('chain_state').select('hidden').eq('group_id', groupId).maybeSingle(),
    ])
    if (!cardsRes.error) cards.value = cardsRes.data ?? []
    if (!chainRes.error) chainLinks.value = chainRes.data ?? []
    chainVisible.value = !(chainStateRes.data?.hidden ?? false)
    loading.value = false
  }

  async function createCard({ groupId, sessionId, type, label, data, origin = 'handler', revealed = false }) {
    if (!_groupId) return null
    const { data: { user } } = await supabase.auth.getUser()
    const { data: card, error } = await supabase
      .from('cards')
      .insert({ group_id: groupId, session_id: sessionId, type, label, data, origin, revealed, created_by: user.id, operation_id: _operationId })
      .select()
      .single()
    if (error) throw error
    const x = 120 + Math.random() * 600
    const y = 120 + Math.random() * 400
    await supabase.from('card_positions').insert({ card_id: card.id, minimized: true, x, y })
    await loadBoard(groupId, _operationId)
    return card
  }

  async function setPosition(cardId, x, y) {
    const card = cards.value.find(c => c.id === cardId)
    if (card) {
      const pos = getPos(card)
      if (pos) { pos.x = x; pos.y = y }
    }
    if (!_groupId) return
    const { error } = await supabase.from('card_positions').update({ x, y }).eq('card_id', cardId)
    if (error) throw error
  }

  async function setRevealed(cardId, revealed) {
    cards.value = cards.value.map(c => c.id === cardId ? { ...c, revealed } : c)
    if (!_groupId) return
    const { error } = await supabase.from('cards').update({ revealed }).eq('id', cardId)
    if (error) throw error
    if (revealed && _groupId) {
      await supabase.from('reveal_notifications').insert({ group_id: _groupId, card_id: cardId })
    }
  }

  async function setMinimized(cardId, minimized) {
    cards.value = cards.value.map(c => {
      if (c.id !== cardId) return c
      const positions = Array.isArray(c.card_positions) ? c.card_positions : (c.card_positions ? [c.card_positions] : [])
      const updated = positions.length
        ? positions.map(p => ({ ...p, minimized }))
        : [{ card_id: cardId, minimized }]
      return { ...c, card_positions: updated }
    })
    if (!_groupId) return
    const { error } = await supabase
      .from('card_positions')
      .upsert({ card_id: cardId, minimized }, { onConflict: 'card_id' })
    if (error) throw error
  }

  async function updateCard(cardId, { label, data, revealed }) {
    cards.value = cards.value.map(c => c.id === cardId ? { ...c, label, data, revealed } : c)
    if (!_groupId) return
    const { error } = await supabase.from('cards').update({ label, data, revealed }).eq('id', cardId)
    if (error) throw error
  }

  async function deleteCard(cardId) {
    cards.value = cards.value.filter(c => c.id !== cardId)
    chainLinks.value = chainLinks.value.filter(l => l.card_id !== cardId)
    if (!_groupId) return
    const { error } = await supabase.from('cards').delete().eq('id', cardId)
    if (error) throw error
  }

  // ─── Red thread ─────────────────────────────────────────────────────────────

  async function addToChain(cardId) {
    const nextPos = chainLinks.value.length
      ? Math.max(...chainLinks.value.map(l => l.position)) + 1
      : 1
    if (!_groupId) {
      chainLinks.value.push({ id: `local-${cardId}`, card_id: cardId, position: nextPos })
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('chain_links')
      .insert({ group_id: _groupId, card_id: cardId, position: nextPos, added_by: user.id, operation_id: _operationId })
      .select()
      .single()
    if (error) throw error
    if (data) chainLinks.value.push(data)
  }

  async function removeFromChain(cardId) {
    chainLinks.value = chainLinks.value.filter(l => l.card_id !== cardId)
    if (!_groupId) return
    const { error } = await supabase.from('chain_links').delete().eq('card_id', cardId)
    if (error) throw error
  }

  async function moveChainItem(cardId, direction) {
    const sorted = [...chainLinks.value].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex(l => l.card_id === cardId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const [curr, swap] = [sorted[idx], sorted[swapIdx]]
    chainLinks.value = chainLinks.value.map(l => {
      if (l.id === curr.id) return { ...l, position: swap.position }
      if (l.id === swap.id) return { ...l, position: curr.position }
      return l
    })
    if (!_groupId) return
    await Promise.all([
      supabase.from('chain_links').update({ position: swap.position }).eq('id', curr.id),
      supabase.from('chain_links').update({ position: curr.position }).eq('id', swap.id),
    ])
  }

  async function setChainVisible(visible) {
    chainVisible.value = visible
    if (!_groupId) return
    await supabase
      .from('chain_state')
      .upsert({ group_id: _groupId, hidden: !visible }, { onConflict: 'group_id' })
  }

  // ─── Realtime ──────────────────────────────────────────────────────────────

  function subscribeRealtime(groupId) {
    channel = supabase
      .channel(`board:${groupId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cards',
        filter: `group_id=eq.${groupId}`,
      }, () => loadBoard(groupId, _operationId))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'card_positions',
      }, () => loadBoard(groupId, _operationId))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chain_links',
        filter: `group_id=eq.${groupId}`,
      }, () => loadBoard(groupId, _operationId))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chain_state',
        filter: `group_id=eq.${groupId}`,
      }, () => loadBoard(groupId, _operationId))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reveal_notifications',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        await loadBoard(groupId, _operationId)
        lastRevealedId.value = payload.new.card_id
      })
      .subscribe()
  }

  function reset() {
    if (channel) supabase.removeChannel(channel)
    channel = null
    cards.value = []
    chainLinks.value = []
    chainVisible.value = true
    lastRevealedId.value = null
    _groupId = null
    _operationId = null
  }

  return {
    cards, chainLinks, chainVisible, loading, lastRevealedId, onBoard, inDeck, chain,
    getPos, isInChain, getChainPosition,
    loadBoard, createCard, updateCard, setPosition, setRevealed, setMinimized, deleteCard,
    addToChain, removeFromChain, moveChainItem, setChainVisible,
    subscribeRealtime, reset,
  }
})
