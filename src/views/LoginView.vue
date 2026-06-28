<template>
  <div class="relative flex h-screen items-center justify-center"
       style="background-image: url('/bg.png'); background-size: cover; background-position: center;">
    <!-- Mørkt overlay så tekst og form er læsbar -->
    <div class="absolute inset-0 bg-black/60" />

    <div class="relative w-full max-w-sm space-y-6 px-6">
      <h1 class="text-5xl tracking-wide" style="font-family: 'Jersey 10', sans-serif; color: #3d6b4a;">
        Find den perfekte nat i operaen
      </h1>

      <form v-if="!sent" @submit.prevent="sendMagicLink" class="space-y-4">
        <input
          v-model="email"
          type="email"
          required
          placeholder="Din e-mailadresse"
          class="w-full rounded bg-neutral-800 border border-neutral-700 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
        />
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 px-4 py-2 text-neutral-100 transition-colors"
        >
          {{ loading ? 'Sender…' : 'Send login-link' }}
        </button>
        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      </form>

      <div v-else class="text-neutral-300 text-sm leading-relaxed">
        <p>Tjek din indbakke — vi har sendt et login-link til <strong>{{ email }}</strong>.</p>
      </div>
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
import { supabase } from '../lib/supabase'

const route = useRoute()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function sendMagicLink() {
  loading.value = true
  error.value = ''

  const redirectTo = `${window.location.origin}${route.query.redirect || '/dashboard'}`

  const { error: err } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { emailRedirectTo: redirectTo },
  })

  if (err) {
    error.value = err.message
  } else {
    sent.value = true
  }
  loading.value = false
}
</script>
