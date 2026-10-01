import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { en, zhHans } from 'vuetify/locale'

import { DEFAULT_THEME, THEMES, vuetifyColors } from '@/design/tokens'

// 主题色不再写在这里：design/tokens.ts 是全项目唯一的色值来源（多主题加一条即可）。
const themes = Object.fromEntries(
  THEMES.map((theme) => [theme.id, { dark: theme.dark, colors: vuetifyColors(theme) }]),
)

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
    defaultTheme: DEFAULT_THEME,
    themes,
  },
  defaults: {
    VCard: { variant: 'flat', rounded: 'sm', elevation: 0 },
    VBtn: { variant: 'flat', rounded: 'sm' },
    VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VCombobox: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VChip: { rounded: 'sm' },
    VSwitch: { density: 'compact', hideDetails: 'auto', color: 'primary' },
  },
})
