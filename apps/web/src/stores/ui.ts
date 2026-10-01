import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  DEFAULT_PREFERENCE,
  applyThemeVars,
  findTheme,
  isThemePreference,
  resolveTheme,
  type AppTheme,
  type ThemePreference,
} from '@/design/tokens'
import type { AppLocale } from '@/plugins/i18n'

export type { AppTheme, ThemePreference }

const STORAGE_KEY = 'kestrel-ui'

interface StoredUi {
  theme?: ThemePreference
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

/** 系统当前是不是暗色（跟随系统时用） */
function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    ? Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
    : false
}

export const useUiStore = defineStore('ui', () => {
  const stored = readStored()
  // 存着的偏好可能来自更早的版本（那时只有两套主题），认不出来就回默认
  const preference = ref<ThemePreference>(
    isThemePreference(stored.theme) ? stored.theme : DEFAULT_PREFERENCE,
  )
  const locale = ref<AppLocale>(stored.locale ?? 'zh-CN')
  const prefersDark = ref(systemPrefersDark())

  /** 真正生效的那套色值 */
  const theme = computed<AppTheme>(() => resolveTheme(preference.value, prefersDark.value))
  const isDark = computed(() => findTheme(theme.value)?.dark ?? false)

  function setPreference(next: ThemePreference) {
    preference.value = next
    writeStored({ theme: next, locale: locale.value })
  }

  /** 顶栏那个三态段控件是按钮，点一下切到下一个 */
  function cyclePreference() {
    const order: ThemePreference[] = ['light', 'system', 'dark']
    const index = order.indexOf(preference.value)
    setPreference(order[(index + 1) % order.length] ?? 'system')
  }

  function setLocale(next: AppLocale) {
    locale.value = next
    writeStored({ theme: preference.value, locale: next })
  }

  /** 跟随系统时，系统切亮暗要跟着变 */
  function syncSystemTheme(dark: boolean) {
    prefersDark.value = dark
  }

  return {
    preference,
    locale,
    theme,
    isDark,
    setPreference,
    cyclePreference,
    setLocale,
    syncSystemTheme,
  }
})

/** 把当前主题的色值灌到 <html> 上（弹窗、原生控件也跟着换） */
export function applyCurrentTheme(id: AppTheme): void {
  const definition = findTheme(id)
  if (definition) applyThemeVars(definition)
}
