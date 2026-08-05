import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useGroupsStore = defineStore('groups', () => {
  const memberships = ref([]) // [{ role, group: { id, name, description, ... } }]
  const loading = ref(false)

  async function fetchMyGroups() {
    loading.value = true
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('group_members')
      .select('role, group:groups(id, name, description, current_session_id)')
      .eq('user_id', user.id)
    if (!error) memberships.value = data ?? []
    loading.value = false
    return error
  }

  async function createGroup(name, description = '') {
    const { data, error } = await supabase
      .rpc('create_group', { group_name: name, group_description: description })
    if (error) throw error
    await fetchMyGroups()
    return data // group id
  }

  async function joinGroup(inviteCode) {
    const { data, error } = await supabase
      .rpc('join_group', { invite: inviteCode })
    if (error) throw error
    return data // group id
  }

  // Returns all players in the group with their assigned operation ids
  async function fetchGroupPlayers(groupId) {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id, role, profile:profiles!user_id(display_name), operation_memberships:operation_members(operation_id)')
      .eq('group_id', groupId)
      .eq('role', 'player')
    if (error) throw error
    return data ?? []
  }

  async function assignPlayer(operationId, userId) {
    const { error } = await supabase.rpc('assign_player_to_operation', {
      p_operation_id: operationId,
      p_user_id: userId,
    })
    if (error) throw error
  }

  async function removePlayer(operationId, userId) {
    const { error } = await supabase.rpc('remove_player_from_operation', {
      p_operation_id: operationId,
      p_user_id: userId,
    })
    if (error) throw error
  }

  async function invitePlayer(email, groupId) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-player`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, group_id: groupId }),
      }
    )
    const result = await res.json()
    if (!res.ok) throw new Error(result.error ?? 'invite_failed')
    return result // { success, already_existed }
  }

  return {
    memberships, loading,
    fetchMyGroups, createGroup, joinGroup,
    fetchGroupPlayers, assignPlayer, removePlayer, invitePlayer,
  }
})
