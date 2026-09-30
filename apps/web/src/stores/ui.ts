import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AppLocale } from '@/plugins/i18n'

export type AppTheme = 'kestrelLight' | 'kestrelDark'

export const useUiStore = defineStore(
  'ui',
  () => {
    const theme = ref<AppTheme>('kestrelDark')
    const locale = ref<AppLocale>('zh-CN')

    const isDark = computed(() => theme.value === 'kestrelDark')

    function setTheme(next: AppTheme) {
      theme.value = next
    }

    function toggleTheme() {
      theme.value = isDark.value ? 'kestrelLight' : 'kestrelDark'
    }

    function setLocale(next: AppLocale) {
      locale.value = next
    }

    return { theme, locale, isDark, setTheme, toggleTheme, setLocale }
  },
  {
    persist: {
      key: 'kestrel-ui',
      pick: ['theme', 'locale'],
    },
  },
)
