import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { en, zhHans } from 'vuetify/locale'

import { BREAKPOINTS, DEFAULT_THEME, THEMES, TYPE, vuetifyColors } from '@/design/tokens'

// 主题色不写在这里：design/tokens/color.ts 是全项目唯一的色值来源（多套颜色模板加一条即可）。
const themes = Object.fromEntries(
  THEMES.map((theme) => [theme.id, { dark: theme.dark, colors: vuetifyColors(theme) }]),
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
  // 断点跟 foundation 对齐：手机 <600 / 大手机 600 / 桌面布局 900 / 宽屏 1440
  display: {
    thresholds: {
      xs: 0,
      sm: BREAKPOINTS.sm,
      md: BREAKPOINTS.md,
      lg: BREAKPOINTS.lg,
      xl: BREAKPOINTS.xl,
    },
  },
  // 圆角不在这里配（Vuetify 的 rounded 只认自己的档位，写 3px/4px 会变成不存在的类）：
  // 统一在 styles/components.scss 的「Vuetify 对齐」一节里，用 --k-radius-* 覆盖一遍。
  defaults: {
    VCard: { variant: 'flat', elevation: 0 },
    VBtn: { variant: 'text', density: 'comfortable' },
    // 输入框用 compact = 40px，跟 --k-field-h 对齐；触摸端由 CSS 抬到 44（见 components.scss）
    VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VCombobox: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VChip: { size: TYPE.meta },
    VSwitch: { density: 'compact', hideDetails: 'auto', color: 'primary' },
    VDialog: { scrim: true },
  },
})
