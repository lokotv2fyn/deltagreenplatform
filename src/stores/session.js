import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useSessionStore = defineStore('session', () => {
  const group = ref(null)
  const currentSession = ref(null)
  const loading = ref(false)

  const sessionStatus = computed(() => currentSession.value?.status ?? null)
  const isActive = computed(() => sessionStatus.value === 'active')
  const isPaused = computed(() => sessionStatus.value === 'paused')
  const currentOperation = computed(() => group.value?.current_operation ?? null)

  async function loadGroup(groupId) {
    loading.value = true
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description, created_by, current_session_id, created_at, current_session:sessions!current_session_id(*), current_operation:operations!current_operation_id(id, name)')
      .eq('id', groupId)
      .single()
    if (!error) {
      group.value = data
      currentSession.value = data.current_session ?? null
    }
    loading.value = false
    return error
  }

  async function startSession(label = null) {
    const { error } = await supabase.rpc('start_new_session', {
      target_group: group.value.id,
      new_label: label,
    })
    if (error) throw error
    await loadGroup(group.value.id)
  }

  async function stopSession() {
    const { error } = await supabase.rpc('stop_session', {
      target_group: group.value.id,
    })
    if (error) throw error
    await loadGroup(group.value.id)
  }

  // Realtime: update session status when another client changes it
  let channel = null
  function subscribeSession(groupId) {
    channel = supabase
      .channel(`session:${groupId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
      }, () => loadGroup(groupId))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'groups',
        filter: `id=eq.${groupId}`,
      }, () => loadGroup(groupId))
      .subscribe()
  }

  function unsubscribeSession() {
    if (channel) supabase.removeChannel(channel)
    channel = null
  }

  function reset() {
    unsubscribeSession()
    group.value = null
    currentSession.value = null
  }

  return {
    group, currentSession, currentOperation, loading, sessionStatus, isActive, isPaused,
    loadGroup, startSession, stopSession, subscribeSession, unsubscribeSession, reset,
  }
})
