<template>
  <div class="relative flex h-screen items-center justify-center"
       style="background-image: url('/bg.png'); background-size: cover; background-position: center;">
    <div class="absolute inset-0 bg-black/60" />

    <div class="relative w-full max-w-sm space-y-6 px-6">
      <h1 class="text-5xl tracking-wide" style="font-family: 'Jersey 10', sans-serif; color: #3d6b4a;">
        {{ t('login.title') }}
      </h1>

      <form v-if="!sent" @submit.prevent="sendMagicLink" class="space-y-4">
        <input
          v-model="email"
          type="email"
          required
          :placeholder="t('login.email_placeholder')"
          class="w-full rounded bg-neutral-800 border border-neutral-700 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
        />
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 px-4 py-2 text-neutral-100 transition-colors"
        >
          {{ loading ? t('login.sending') : t('login.submit') }}
        </button>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        <p v-if="notAuthorized" class="text-sm text-red-400">{{ t('login.not_authorized') }}</p>
      </form>

      <div v-else class="text-neutral-300 text-sm leading-relaxed">
        <p>{{ t('login.sent') }} <strong>{{ email }}</strong>.</p>
      </div>
    </div>

    <!-- Legal -->
    <div class="fixed bottom-0 left-0 right-0 flex justify-center pb-4 px-6 pointer-events-none">
      <p class="text-center text-xs font-mono leading-relaxed max-w-xl" style="color: #3d5040;">
        This is a fan-made, noncommercial project. Delta Green is a trademark and copyright owned by the Delta Green Partnership, used here under their fan content policy. This project is not affiliated with or endorsed by Arc Dream Publishing or the Delta Green Partnership.
      </p>
    </div>

    <!-- Language toggle -->
    <div class="absolute bottom-4 left-5">
      <button @click="toggleLang"
              class="text-xs font-mono transition-colors"
              style="color: #2a3a2e;"
              onmouseenter="this.style.color='#4a7c59'"
              onmouseleave="this.style.color='#2a3a2e'">
        {{ locale === 'da' ? t('lang.en') : t('lang.da') }}
      </button>
    </div>

    <!-- Version -->
    <div class="absolute bottom-4 right-5">
      <span class="text-xs font-mono" style="color: #2a3a2e;">v0.513</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLang } from '../composables/useLang'

const { t } = useI18n()
const { locale, toggleLang } = useLang()

const route = useRoute()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')
const notAuthorized = ref(false)

async function sendMagicLink() {
  loading.value = true
  error.value = ''
  notAuthorized.value = false

  const redirectTo = `${window.location.origin}${route.query.redirect || '/dashboard'}`

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-magic-link`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: email.value, redirectTo }),
    }
  )

  if (res.status === 403) {
    notAuthorized.value = true
  } else if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    error.value = body.error ?? t('login.error')
  } else {
    sent.value = true
  }
  loading.value = false
}
</script>
