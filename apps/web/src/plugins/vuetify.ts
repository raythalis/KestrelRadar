import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { en, zhHans } from 'vuetify/locale'

// Kestrel 主色：青蓝（red-tailed 猎隼不会有的颜色，避免和常见的 indigo 中台撞脸）
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
          background: '#f6f7f9',
          surface: '#ffffff',
          primary: '#0b7285',
          secondary: '#5c6b73',
          accent: '#d9480f',
          info: '#1971c2',
          success: '#2f9e44',
          warning: '#e8590c',
          error: '#c92a2a',
        },
      },
      kestrelDark: {
        dark: true,
        colors: {
          background: '#11161a',
          surface: '#161d23',
          primary: '#22b8cf',
          secondary: '#8fa3ad',
          accent: '#ff922b',
          info: '#4dabf7',
          success: '#51cf66',
          warning: '#ffa94d',
          error: '#ff6b6b',
        },
      },
    },
  },
  defaults: {
    VCard: { variant: 'flat', rounded: 'lg' },
    VBtn: { variant: 'flat' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
  },
})
