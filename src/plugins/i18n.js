import { createI18n } from 'vue-i18n'
import da from '../locales/da.json'
import en from '../locales/en.json'

const saved = localStorage.getItem('dg-locale') ?? 'da'

export const i18n = createI18n({
  legacy: false,
  locale: saved,
  fallbackLocale: 'da',
  messages: { da, en },
})
