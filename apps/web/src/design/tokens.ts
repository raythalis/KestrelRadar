// Kestrel 设计基准之一：色值与主题。
//
// 这里是全项目唯一的色值来源 —— 组件不写死颜色，只用 CSS 变量 --k-*；
// Vuetify 的主题色也由这里生成，避免同一套色值散落两处。
// 加一套新主题（后面要做多主题）：在 THEMES 里加一条即可，Vuetify 主题、顶栏切换、
// 变量注入都会自动跟上（记得补一条 theme.<id> 文案）。
//
// 视觉基准：docs/design/config-management.html（尺寸、间距、组件形态都照它来）。

export interface ThemeTokens {
  /** 页面底色 */
  bg: string
  /** 左侧导航底色 */
  rail: string
  /** 卡片/顶栏等面板底色 */
  panel: string
  /** 面板内的次级底色（列、内嵌卡片） */
  panel2: string
  /** 常规描边 */
  border: string
  /** 更淡的分隔线 */
  borderSoft: string
  /** 正文色 */
  text: string
  /** 次要文字 */
  muted: string
  /** 最弱的提示文字 */
  faint: string
  /** 强调色（按钮、选中态） */
  accent: string
  /** 强调色的浅底 */
  accentSoft: string
  /** 第二强调色（链接、信息） */
  blue: string
  /** 正常状态 */
  ok: string
  /** 需要注意 */
  warn: string
  /** 出错状态 */
  err: string
  /** 圆角 */
  radius: string
  /** 卡片阴影 */
  shadow: string
}

export interface ThemeDefinition {
  /** 主题 id：同时是 Vuetify 主题名、本地存储里的取值、切换按钮的 data-test 后缀 */
  id: string
  dark: boolean
  /** 文案 key */
  labelKey: string
  tokens: ThemeTokens
}

export const THEMES = [
  {
    id: 'kestrelDark',
    dark: true,
    labelKey: 'theme.dark',
    tokens: {
      bg: '#0d1017',
      rail: '#12151d',
      panel: '#161a23',
      panel2: '#1c212c',
      border: '#262c38',
      borderSoft: '#1f2530',
      text: '#e7eaf1',
      muted: '#9aa4b6',
      faint: '#6b7488',
      accent: '#f0a34a',
      accentSoft: 'rgba(240, 163, 74, 0.14)',
      blue: '#6ea8fe',
      ok: '#46c07a',
      warn: '#e0a33e',
      err: '#e2685f',
      radius: '12px',
      shadow: '0 1px 0 rgba(255, 255, 255, 0.02) inset, 0 8px 24px rgba(0, 0, 0, 0.25)',
    },
  },
  {
    id: 'kestrelLight',
    dark: false,
    labelKey: 'theme.light',
    tokens: {
      bg: '#f4f5f8',
      rail: '#ffffff',
      panel: '#ffffff',
      panel2: '#f7f8fb',
      border: '#e2e6ee',
      borderSoft: '#edf0f5',
      text: '#1b1f27',
      muted: '#6a7383',
      faint: '#8b94a3',
      accent: '#c97a12',
      accentSoft: 'rgba(201, 122, 18, 0.12)',
      blue: '#2f6fd0',
      ok: '#1f9d5b',
      warn: '#b7791f',
      err: '#c9534a',
      radius: '12px',
      shadow: '0 1px 2px rgba(20, 25, 35, 0.06), 0 8px 24px rgba(20, 25, 35, 0.06)',
    },
  },
] as const satisfies readonly ThemeDefinition[]

export type AppTheme = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: AppTheme = 'kestrelDark'

export function findTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find((theme) => theme.id === id)
}

/** token 名 -> CSS 变量名（组件里只认 --k-*） */
const VAR_NAMES: Record<keyof ThemeTokens, string> = {
  bg: '--k-bg',
  rail: '--k-rail',
  panel: '--k-panel',
  panel2: '--k-panel-2',
  border: '--k-border',
  borderSoft: '--k-border-soft',
  text: '--k-text',
  muted: '--k-muted',
  faint: '--k-faint',
  accent: '--k-accent',
  accentSoft: '--k-accent-soft',
  blue: '--k-blue',
  ok: '--k-ok',
  warn: '--k-warn',
  err: '--k-err',
  radius: '--k-radius',
  shadow: '--k-shadow',
}

export function cssVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, name] of Object.entries(VAR_NAMES)) {
    vars[name] = tokens[key as keyof ThemeTokens]
  }
  return vars
}

/** 注入到 <html> 上：弹窗、菜单会被传送到 body，挂在根节点才不会掉色 */
export function applyThemeVars(theme: ThemeDefinition): void {
  const root = document.documentElement
  for (const [name, value] of Object.entries(cssVars(theme.tokens))) {
    root.style.setProperty(name, value)
  }
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
