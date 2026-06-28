<template>
  <div class="flex h-screen items-center justify-center" style="background-color: #080808;">
    <div class="w-full max-w-sm px-6 space-y-4 text-center">

      <div v-if="state === 'loading'" class="text-xs font-mono tracking-[0.2em] uppercase" style="color: #3a3a3a;">
        {{ t('join.loading') }}
      </div>

      <div v-else-if="state === 'success'" class="space-y-2">
        <p class="text-sm font-mono" style="color: #4a7c59;">{{ t('join.success') }}</p>
        <p class="text-xs font-mono tracking-wider" style="color: #3a3a3a;">{{ t('join.redirecting') }}</p>
      </div>

      <div v-else-if="state === 'error'" class="space-y-3">
        <p class="text-xs font-mono" style="color: #dc2626;">{{ errorMsg }}</p>
        <p class="text-xs font-mono" style="color: #3a3a3a;">{{ t('join.contact_handler') }}</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '../lib/supabase'
import { useGroupsStore } from '../stores/groups'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const groups = useGroupsStore()

const state = ref('loading')
const errorMsg = ref('')

onMounted(async () => {
  const inviteCode = route.params.inviteCode
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.replace(`/login?redirect=/join/${inviteCode}`)
    return
  }
  try {
    const groupId = await groups.joinGroup(inviteCode)
    state.value = 'success'
    setTimeout(() => router.replace(`/play/${groupId}`), 800)
  } catch (err) {
    state.value = 'error'
    errorMsg.value = err.message
  }
})
</script>
