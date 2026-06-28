<template>
  <Teleport to="body">
    <!-- SMS / comms -->
    <div v-if="isSms"
         style="position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;background:rgba(0,0,0,0.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;"
         @click.self="$emit('close')">
      <div class="sms-phone">
        <div class="sms-header">
          <span class="sms-icon">✉</span>
          <span>{{ t('reveal.sms_header') }}</span>
          <button @click="$emit('close')" class="sms-close">×</button>
        </div>
        <div class="sms-screen">
          <p class="sms-from">{{ t('reveal.sms_from', { sender: card.data?.sender ?? t('reveal.sms_unknown') }) }}</p>
          <div class="sms-divider" />
          <p class="sms-body">{{ card.data?.message ?? card.label }}</p>
          <p v-if="card.data?.time" class="sms-time">{{ card.data.time }}</p>
        </div>
        <div class="sms-footer">
          <button @click="$emit('close')" class="sms-ok">OK</button>
        </div>
      </div>
    </div>

    <!-- Generic reveal -->
    <div v-else
         style="position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;background:rgba(0,0,0,0.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;"
         @click.self="$emit('close')">
      <div class="reveal-card">
        <div class="reveal-header">
          <span class="reveal-type">{{ typeLabel }}</span>
          <button @click="$emit('close')" class="reveal-close">×</button>
        </div>

        <h2 class="reveal-label">{{ card.label }}</h2>

        <div v-if="imageUrl" class="reveal-image-wrap">
          <img :src="imageUrl" class="reveal-image" />
        </div>

        <div class="reveal-fields">
          <template v-for="field in visibleFields" :key="field.key">
            <div v-if="fieldVal(field)" class="reveal-field">
              <p class="reveal-field-label">{{ resolvedFieldLabel(field) }}</p>
              <p v-if="Array.isArray(fieldVal(field))" class="reveal-field-value">
                {{ fieldVal(field).join(', ') }}
              </p>
              <div v-else-if="field.key === 'lines'"
                   class="font-mono text-xs text-green-400 bg-black rounded p-2 space-y-0.5">
                <div v-for="(line, i) in fieldVal(field)" :key="i">{{ line }}</div>
              </div>
              <p v-else-if="['body','notes','description','analysis','message'].includes(field.key)"
                 v-html="renderRedacted(String(fieldVal(field)))"
                 class="reveal-field-value whitespace-pre-wrap leading-relaxed" />
              <p v-else class="reveal-field-value">{{ fieldVal(field) }}</p>
            </div>
          </template>
        </div>

        <button @click="$emit('close')" class="reveal-dismiss">{{ t('reveal.dismiss') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CARD_TYPES, PLAYER_CARD_TYPES } from '../config/cardTypes'
import { renderRedacted } from '../lib/renderRedacted'

const { t, locale } = useI18n()

const props = defineProps({
  card: { type: Object, required: true },
})
defineEmits(['close'])

const isSms     = computed(() => props.card.type === 'comms')
const typeDef   = computed(() => CARD_TYPES[props.card.type] ?? PLAYER_CARD_TYPES[props.card.type])
const typeLabel = computed(() => {
  const def = typeDef.value
  if (!def) return props.card.type
  return locale.value === 'en' && def.labelEn ? def.labelEn : def.label
})
const imageUrl  = computed(() => props.card.data?.imageUrl ?? null)

const visibleFields = computed(() =>
  (typeDef.value?.fields ?? []).filter(f => f.key !== 'imageUrl')
)

function fieldVal(field) {
  return props.card.data?.[field.key]
}

function resolvedFieldLabel(field) {
  return locale.value === 'en' && field.labelEn ? field.labelEn : field.label
}
</script>

<style scoped>
/* ── SMS ──────────────────────────────────────────────── */
.sms-phone {
  width: 220px;
  background: #1a1a1a;
  border: 3px solid #444;
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(0,0,0,0.8), inset 0 1px 0 #555;
  overflow: hidden;
  font-family: 'Courier New', monospace;
}
.sms-header {
  background: #111;
  border-bottom: 2px solid #333;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #aaa;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sms-icon { font-size: 12px; }
.sms-close {
  margin-left: auto;
  color: #666;
  font-size: 16px;
  line-height: 1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.sms-close:hover { color: #ccc; }
.sms-screen {
  background: #0d1a0d;
  padding: 12px 10px;
  min-height: 100px;
  border-bottom: 2px solid #222;
}
.sms-from {
  font-size: 10px;
  color: #5a5;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}
.sms-divider {
  border-top: 1px solid #2a3a2a;
  margin-bottom: 10px;
}
.sms-body {
  font-size: 12px;
  color: #8f8;
  line-height: 1.5;
  word-break: break-word;
}
.sms-time {
  font-size: 9px;
  color: #4a4;
  margin-top: 10px;
  text-align: right;
}
.sms-footer {
  background: #111;
  padding: 8px 10px;
  display: flex;
  justify-content: center;
}
.sms-ok {
  background: #222;
  border: 1px solid #444;
  border-radius: 4px;
  color: #8f8;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  padding: 4px 20px;
  cursor: pointer;
  letter-spacing: 0.1em;
}
.sms-ok:hover { background: #2a2a2a; }

/* ── GENERIC REVEAL ──────────────────────────────────── */
.reveal-card {
  background: #0e0e0e;
  border: 1px solid #333;
  border-top: 2px solid #dc2626;
  border-radius: 4px;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 0 60px rgba(220, 38, 38, 0.15), 0 20px 60px rgba(0,0,0,0.9);
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: revealIn 0.25s ease-out;
}
@keyframes revealIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.reveal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 8px;
  border-bottom: 1px solid #1f1f1f;
}
.reveal-type {
  font-size: 10px;
  color: #dc2626;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: monospace;
}
.reveal-close {
  color: #555;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.reveal-close:hover { color: #ccc; }
.reveal-label {
  padding: 14px 16px 10px;
  font-size: 1.15rem;
  font-weight: 600;
  color: #e5e5e5;
  line-height: 1.3;
}
.reveal-image-wrap { padding: 0 16px 10px; }
.reveal-image {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 2px;
}
.reveal-fields {
  padding: 0 16px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.reveal-field-label {
  font-size: 10px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}
.reveal-field-value {
  font-size: 13px;
  color: #bbb;
}
.reveal-dismiss {
  margin: 16px;
  padding: 8px 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 3px;
  color: #666;
  font-size: 12px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.reveal-dismiss:hover {
  color: #ccc;
  border-color: #555;
}
</style>
