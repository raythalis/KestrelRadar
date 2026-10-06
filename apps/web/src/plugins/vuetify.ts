import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { en, zhHans } from 'vuetify/locale'

import {
  DEFAULT_THEME,
  V2_BREAKPOINTS,
  V2_THEMES,
  V2_TYPE,
  vuetifyColors,
} from '@/design/v2/tokens'

// 色值不写在这里：design/v2/tokens.ts 是全项目唯一的 token source，Vuetify 主题由它生成。
const themes = Object.fromEntries(
  V2_THEMES.map((theme) => [theme.id, { dark: theme.dark, colors: vuetifyColors(theme.dark) }]),
)

// Foundation → Vuetify：密度、圆角、控件高度都跟 tokens 走，组件里不再逐个覆盖。
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
  // 断点跟同一份 token 对齐
  display: {
    thresholds: {
      xs: 0,
      sm: V2_BREAKPOINTS.sm,
      md: V2_BREAKPOINTS.md,
      lg: V2_BREAKPOINTS.lg,
      xl: V2_BREAKPOINTS.xl,
    },
  },
  // 圆角不在这里配（Vuetify 的 rounded 只认自己的档位，写 8px/12px 会变成不存在的类）：
  // 统一在 styles/components.scss 的「Vuetify 对齐」一节里，用 --k2-r-* 覆盖一遍。
  defaults: {
    VCard: { variant: 'flat', elevation: 0 },
    VBtn: { variant: 'text', density: 'comfortable' },
    // 输入框用 compact = 40px，跟 --k2-field-h（44）之间由 CSS 的 min-height 拉平
    VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VCombobox: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VChip: { size: V2_TYPE.caption },
    VSwitch: { density: 'compact', hideDetails: 'auto', color: 'primary' },
    VDialog: { scrim: true },
  },
})
