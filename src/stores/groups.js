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
      .select('role, group:groups(id, name, description, invite_code, invite_expires_at, current_session_id)')
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

  return { memberships, loading, fetchMyGroups, createGroup, joinGroup }
})
