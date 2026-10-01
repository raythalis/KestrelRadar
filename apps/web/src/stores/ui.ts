import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_THEME, findTheme, type AppTheme } from '@/design/tokens'
import type { AppLocale } from '@/plugins/i18n'

export type { AppTheme }

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
  // 存着的主题可能来自更早的版本，找不到就回默认
  const theme = ref<AppTheme>(
    findTheme(stored.theme ?? '') ? (stored.theme as AppTheme) : DEFAULT_THEME,
  )
  const locale = ref<AppLocale>(stored.locale ?? 'zh-CN')

  const isDark = computed(() => findTheme(theme.value)?.dark ?? true)

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
