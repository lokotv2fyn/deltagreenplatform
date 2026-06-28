<template>
  <div v-if="auth.loading" class="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400">
    Indlæser…
  </div>
  <RouterView v-else />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
onMounted(() => auth.init())
</script>
