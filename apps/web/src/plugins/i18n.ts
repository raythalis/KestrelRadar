import { createI18n } from 'vue-i18n'

import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'

export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export default createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})
