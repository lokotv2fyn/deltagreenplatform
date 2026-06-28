<template>
  <div class="min-h-screen text-neutral-200" style="background-color: #080808;">

    <!-- Header -->
    <header class="px-8 py-5 flex items-center justify-between" style="border-bottom: 1px solid #1a1a1a;">
      <div>
        <p class="text-xs font-mono tracking-[0.3em] uppercase mb-1" style="color: #506858;">
          Program // Klassificeret adgang
        </p>
        <div class="flex items-center gap-3">
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <polygon points="7,0 0,11 14,11" fill="#4a7c59"/>
          </svg>
          <span class="text-2xl tracking-widest text-neutral-100 uppercase" style="font-family: 'Jersey 10', sans-serif;">
            Delta Green
          </span>
          <span class="text-xs font-mono" style="color: #2a3a2e; margin-left: 0.5rem; align-self: flex-end; padding-bottom: 2px;">v0.513</span>
        </div>
      </div>
      <button
        @click="auth.signOut()"
        class="text-xs font-mono tracking-[0.15em] uppercase transition-colors"
        style="color: #506858;"
        onmouseenter="this.style.color='#dc2626'"
        onmouseleave="this.style.color='#506858'"
      >
        Afbryd forbindelse
      </button>
    </header>

    <main class="max-w-2xl mx-auto px-8 py-12">

      <!-- Section header -->
      <div class="flex items-end justify-between mb-8" style="border-bottom: 1px solid #141414; padding-bottom: 1rem;">
        <div>
          <p class="text-xs font-mono tracking-[0.25em] uppercase mb-2" style="color: #506858;">
            Aktive operationer
          </p>
          <p class="text-xs font-mono" style="color: #5e8068;">
            <span v-if="groups.loading">Henter filer…</span>
            <span v-else>{{ groups.memberships.length }} fil{{ groups.memberships.length !== 1 ? 'er' : '' }} tilgængelig{{ groups.memberships.length !== 1 ? 'e' : '' }}</span>
          </p>
        </div>
        <button
          v-if="auth.profile?.can_create_groups"
          @click="showCreate = true"
          class="text-xs font-mono tracking-[0.15em] uppercase px-4 py-2 transition-colors"
          style="border: 1px solid #2a2a2a; color: #5e8068;"
          onmouseenter="this.style.borderColor='#5e8068'; this.style.color='#ccc';"
          onmouseleave="this.style.borderColor='#2a2a2a'; this.style.color='#5e8068';"
        >
          + Ny operation
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="!groups.loading && groups.memberships.length === 0"
           class="py-8 text-center">
        <p class="text-xs font-mono tracking-widest uppercase" style="color: #333;">
          Ingen operationer tilknyttet denne agent
        </p>
      </div>

      <!-- Operation list -->
      <ul v-else class="space-y-px">
        <li
          v-for="m in groups.memberships"
          :key="m.group.id"
          @click="enter(m)"
          class="operation-card cursor-pointer transition-all"
          style="border: 1px solid #1a1a1a; background: #0d0d0d; padding: 1.25rem 1.5rem;"
        >
          <div class="flex items-start justify-between gap-6">
            <div class="flex-1 min-w-0">
              <!-- Role stamp -->
              <p class="text-xs font-mono tracking-[0.2em] uppercase mb-2"
                 :style="m.role === 'handler' ? 'color: #92400e;' : 'color: #1f4a2a;'">
                {{ m.role === 'handler' ? '▸ Handler' : '▸ Agent' }}
              </p>
              <!-- Name -->
              <p class="font-mono text-sm tracking-wide" style="color: #c4c4c4;">
                {{ m.group.name }}
              </p>
              <!-- Description -->
              <p v-if="m.group.description" class="text-xs font-mono mt-1.5" style="color: #404040;">
                {{ m.group.description }}
              </p>
            </div>

            <!-- Access indicator -->
            <div class="shrink-0 text-right mt-0.5">
              <span
                class="text-xs font-mono tracking-widest uppercase px-2 py-0.5"
                :style="m.role === 'handler'
                  ? 'border: 1px solid #92400e; color: #d97706; background: rgba(146,64,14,0.1);'
                  : 'border: 1px solid #1f3a28; color: #4a7c59; background: rgba(31,58,40,0.2);'"
              >
                {{ m.role === 'handler' ? 'Handler' : 'Agent' }}
              </span>
            </div>
          </div>
        </li>
      </ul>

    </main>

    <!-- Modal: Opret operation -->
    <div
      v-if="showCreate"
      class="fixed inset-0 flex items-center justify-center p-4 z-50"
      style="background: rgba(0,0,0,0.85);"
      @click.self="showCreate = false"
    >
      <div class="w-full max-w-md" style="background: #0d0d0d; border: 1px solid #2a2a2a;">

        <!-- Modal header -->
        <div class="px-6 py-4" style="border-bottom: 1px solid #1a1a1a;">
          <p class="text-xs font-mono tracking-[0.25em] uppercase mb-1" style="color: #506858;">Ny operation</p>
          <h2 class="text-sm font-mono tracking-wide text-neutral-300">Opret operationsfil</h2>
        </div>

        <div class="px-6 py-5 space-y-4">
          <div>
            <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
              Operationsnavn
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="fx Delta Green — Roskilde"
              class="w-full font-mono text-sm px-3 py-2 focus:outline-none"
              style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;"
            />
          </div>
          <div>
            <label class="text-xs font-mono tracking-[0.15em] uppercase block mb-2" style="color: #506858;">
              Beskrivelse <span style="color: #3a5040;">(valgfri)</span>
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Vises for agenter"
              class="w-full font-mono text-sm px-3 py-2 focus:outline-none resize-none"
              style="background: #080808; border: 1px solid #2a2a2a; color: #c4c4c4;"
            />
          </div>

          <p v-if="createError" class="text-xs font-mono" style="color: #dc2626;">{{ createError }}</p>
        </div>

        <div class="px-6 py-4 flex justify-end gap-4" style="border-top: 1px solid #1a1a1a;">
          <button
            @click="showCreate = false"
            class="text-xs font-mono tracking-[0.15em] uppercase transition-colors"
            style="color: #506858;"
          >
            Annuller
          </button>
          <button
            @click="submitCreate"
            :disabled="!form.name.trim() || creating"
            class="text-xs font-mono tracking-[0.15em] uppercase px-4 py-2 transition-colors disabled:opacity-30"
            style="border: 1px solid #4a7c59; color: #4a7c59;"
          >
            {{ creating ? 'Opretter…' : 'Bekræft' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useGroupsStore } from '../stores/groups'

const router = useRouter()
const auth = useAuthStore()
const groups = useGroupsStore()

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const form = ref({ name: '', description: '' })

onMounted(() => groups.fetchMyGroups())

function enter(membership) {
  const { role, group } = membership
  if (role === 'handler') {
    router.push(`/handler/${group.id}`)
  } else {
    router.push(`/play/${group.id}`)
  }
}

async function submitCreate() {
  if (!form.value.name.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const groupId = await groups.createGroup(form.value.name.trim(), form.value.description.trim())
    showCreate.value = false
    form.value = { name: '', description: '' }
    router.push(`/handler/${groupId}`)
  } catch (err) {
    createError.value = err.message
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.operation-card:hover {
  border-color: #333 !important;
  background: #111 !important;
}
</style>
