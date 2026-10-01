// Design System · Foundation 入口
//
// 分层（页面 → 组件 → 变量 → 主题，单向依赖）：
//
//   Pages                 信息结构 + 数据 + 业务交互，不写视觉
//     ↓
//   App* 组件             组合 Vuetify + 下面的 --k-* 变量
//     ↓
//   --k-* CSS 变量        colorVars() + foundationVars()
//     ↓
//   Foundation            color.ts（色值）/ foundation.ts（形状、排版、间距、断点、页面宽度）
//     ↓
//   Vuetify Theme         由 vuetifyColors() 从同一份 tokens 生成，不另写色值
//
// 加一套颜色模板：color.ts 的 THEMES 加一条；形状与排版改 foundation.ts，一处生效。

export * from './color'
export * from './foundation'

import { THEMES, colorVars, type ThemeDefinition, type ThemeTokens } from './color'
import { foundationVars } from './foundation'

/** 只包含色值的变量（历史接口，测试与文档仍在用） */
export function cssVars(tokens: ThemeTokens): Record<string, string> {
  return colorVars(tokens)
}

/** 一套主题的完整变量：色值 + 形状/排版/间距/断点/页面宽度 */
export function themeVars(theme: ThemeDefinition): Record<string, string> {
  return { ...colorVars(theme.tokens), ...foundationVars(theme.dark) }
}

/** 注入到 <html> 上：弹窗、菜单会被传送到 body，挂在根节点才不会掉色 */
export function applyThemeVars(theme: ThemeDefinition): void {
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeVars(theme))) {
    root.style.setProperty(name, value)
  }
  // 让浏览器原生控件（滚动条、输入框）也跟着亮暗
  root.style.setProperty('color-scheme', theme.dark ? 'dark' : 'light')
  root.dataset.theme = theme.dark ? 'dark' : 'light'
  // Vuetify 的主题变量定义在 .v-theme--<id> 这个类上。弹窗、菜单、抽屉会被传送到 <body>，
  // 不在 <v-app> 里，所以这个类必须同时挂在 <html> 上，浮层才不会掉回默认亮色。
  for (const item of THEMES) root.classList.toggle(`v-theme--${item.id}`, item.id === theme.id)
}

/** Vuetify 主题色，同样从 tokens 生成 */
export function vuetifyColors(theme: ThemeDefinition): Record<string, string> {
  const { tokens } = theme
  return {
    background: tokens.bg,
    surface: tokens.panel,
    'surface-variant': tokens.panel2,
    'surface-bright': tokens.border,
    primary: tokens.accent,
    secondary: tokens.muted,
    accent: tokens.blue,
    info: tokens.blue,
    success: tokens.ok,
    warning: tokens.warn,
    error: tokens.err,
    'on-surface': tokens.text,
    'on-background': tokens.text,
  }
}

/** 亮暗两套变量表（/design 页面与测试用来逐项展示） */
export function allThemeVars(): { id: string; dark: boolean; vars: Record<string, string> }[] {
  return THEMES.map((theme) => ({ id: theme.id, dark: theme.dark, vars: themeVars(theme) }))
}
