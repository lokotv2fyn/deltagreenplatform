import { useI18n } from 'vue-i18n'
import { i18n } from '../plugins/i18n'

export function useLang() {
  const { locale } = useI18n()

  function toggleLang() {
    const next = locale.value === 'da' ? 'en' : 'da'
    locale.value = next
    localStorage.setItem('dg-locale', next)
  }

  return { locale, toggleLang }
}

export function cardTypeLabel(type, isPlayer = false) {
  const key = isPlayer ? `cardTypes.player_${type}` : `cardTypes.${type}`
  return i18n.global.t(key, type)
}

export function cardFieldLabel(field) {
  const { locale } = i18n.global
  return locale.value === 'en' && field.labelEn ? field.labelEn : field.label
}
