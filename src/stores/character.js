import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useCharacterStore = defineStore('character', () => {
  const mySheet = ref(null)
  const allSheets = ref([])
  const loading = ref(false)
  const saving = ref(false)

  async function loadMySheet(groupId) {
    loading.value = true
    const { data } = await supabase
      .from('character_sheets')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle()
    mySheet.value = data
    loading.value = false
  }

  async function saveMySheet(groupId, userId, sheetData) {
    saving.value = true
    try {
      const { data, error } = await supabase
        .from('character_sheets')
        .upsert(
          { group_id: groupId, user_id: userId, data: sheetData },
          { onConflict: 'group_id,user_id' }
        )
        .select()
        .single()
      if (error) throw error
      mySheet.value = data
    } finally {
      saving.value = false
    }
  }

  async function loadAllSheets(groupId) {
    loading.value = true
    const [membersRes, sheetsRes] = await Promise.all([
      supabase
        .from('group_members')
        .select('user_id, profile:profiles(display_name)')
        .eq('group_id', groupId)
        .eq('role', 'player'),
      supabase
        .from('character_sheets')
        .select('user_id, data, updated_at')
        .eq('group_id', groupId),
    ])
    const sheets = sheetsRes.data ?? []
    allSheets.value = (membersRes.data ?? []).map(m => ({
      userId: m.user_id,
      displayName: m.profile?.display_name ?? 'Ukendt',
      sheet: sheets.find(s => s.user_id === m.user_id) ?? null,
    }))
    loading.value = false
  }

  function reset() {
    mySheet.value = null
    allSheets.value = []
  }

  return { mySheet, allSheets, loading, saving, loadMySheet, saveMySheet, loadAllSheets, reset }
})
