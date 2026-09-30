import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { en, zhHans } from 'vuetify/locale'

// Kestrel 主色：青蓝（红隼身上不会有的颜色，避免和常见的 indigo 中台撞脸）
export default createVuetify({
  locale: {
    locale: 'zhHans',
    fallback: 'en',
    messages: { zhHans, en },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'kestrelDark',
    themes: {
      kestrelLight: {
        dark: false,
        colors: {
          background: '#f4f6f8',
          surface: '#ffffff',
          'surface-variant': '#e9eef2',
          primary: '#0b7285',
          'primary-darken-1': '#095d6d',
          secondary: '#5c6b73',
          accent: '#d9822b',
          info: '#1971c2',
          success: '#2f9e44',
          warning: '#e8890c',
          error: '#c92a2a',
          'on-surface': '#12202a',
        },
      },
      kestrelDark: {
        dark: true,
        colors: {
          background: '#0d1317',
          surface: '#141c22',
          'surface-variant': '#1b252c',
          primary: '#2bb8c9',
          'primary-darken-1': '#22a0b0',
          secondary: '#8fa3ad',
          accent: '#f0a04b',
          info: '#4a9fe0',
          success: '#4cc38a',
          warning: '#e6a23c',
          error: '#e5484d',
          'on-surface': '#e8eef2',
        },
      },
    },
  },
  defaults: {
    VCard: { variant: 'flat', rounded: 'lg', elevation: 0 },
    VBtn: { variant: 'flat', rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VCombobox: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VChip: { rounded: 'lg' },
    VSwitch: { density: 'compact', hideDetails: 'auto', color: 'primary' },
  },
})
