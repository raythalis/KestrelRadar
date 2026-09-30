import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AppLocale } from '@/plugins/i18n'

export type AppTheme = 'kestrelLight' | 'kestrelDark'

const STORAGE_KEY = 'kestrel-ui'

interface StoredUi {
  theme?: AppTheme
  locale?: AppLocale
}

function readStored(): StoredUi {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredUi) : {}
  } catch {
    return {}
  }
}

function writeStored(value: StoredUi) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // 存不进就算了，界面偏好不值得打扰用户
  }
}

export const useUiStore = defineStore('ui', () => {
  const stored = readStored()
  const theme = ref<AppTheme>(stored.theme ?? 'kestrelDark')
  const locale = ref<AppLocale>(stored.locale ?? 'zh-CN')

  const isDark = computed(() => theme.value === 'kestrelDark')

  function setTheme(next: AppTheme) {
    theme.value = next
    writeStored({ theme: next, locale: locale.value })
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'kestrelLight' : 'kestrelDark')
  }

  function setLocale(next: AppLocale) {
    locale.value = next
    writeStored({ theme: theme.value, locale: next })
  }

  return { theme, locale, isDark, setTheme, toggleTheme, setLocale }
})
