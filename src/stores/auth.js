import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const loading = ref(true)

  const user = computed(() => session.value?.user ?? null)
  const isHandler = computed(() => profile.value?.is_handler ?? false)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      if (!newSession) profile.value = null
    })

    if (session.value) await fetchProfile()
    loading.value = false
  }

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = data
  }

  async function signOut() {
    await supabase.auth.signOut()
    profile.value = null
  }

  return { session, profile, user, loading, isHandler, init, fetchProfile, signOut }
})
