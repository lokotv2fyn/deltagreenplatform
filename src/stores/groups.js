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
    // create_group creates the first operation atomically (named after the group)
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

  // Returns all players in the group
  async function fetchGroupPlayers(groupId) {
    const { data: members, error } = await supabase
      .from('group_members')
      .select('user_id, profile:profiles!user_id(display_name)')
      .eq('group_id', groupId)
      .eq('role', 'player')
    if (error) throw error
    return members ?? []
  }

  async function removeMember(groupId, userId) {
    const { error } = await supabase
      .rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId })
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
    fetchGroupPlayers, removeMember, invitePlayer,
  }
})
