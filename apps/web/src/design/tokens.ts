// Kestrel 设计基准之一：色值与主题。
//
// 这里是全项目唯一的色值来源 —— 组件不写死颜色，只用 CSS 变量 --k-*；
// Vuetify 的主题色也由这里生成，避免同一套色值散落两处。
// 加一套新颜色模板（后面要做多主题）：在 THEMES 里加一条即可，Vuetify 主题、变量注入、
// 切换控件都会自动跟上（记得补一条 theme.<id> 文案）。
//
// 视觉基准：原型 A（Figma 风）——浅色优先、小圆角、克制的蓝作为强调色。
// 色值的形状层（圆角、字号、间距、等宽小标签）在 styles/main.scss 里。

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
    id: 'kestrelLight',
    dark: false,
    labelKey: 'theme.light',
    tokens: {
      bg: '#f3f4f7',
      rail: '#ffffff',
      panel: '#ffffff',
      panel2: '#f7f8fb',
      border: '#dde0ea',
      borderSoft: '#e8eaf0',
      text: '#0d0f1a',
      muted: '#6c7280',
      faint: '#9aa0ad',
      accent: '#4f6ef7',
      accentSoft: 'rgba(79, 110, 247, 0.10)',
      blue: '#2f6fd0',
      ok: '#12a150',
      warn: '#b58105',
      err: '#e5484d',
      radius: '4px',
      shadow: '0 1px 2px rgba(13, 15, 26, 0.04)',
    },
  },
  {
    id: 'kestrelDark',
    dark: true,
    labelKey: 'theme.dark',
    tokens: {
      bg: '#0c0e15',
      rail: '#12151d',
      panel: '#141620',
      panel2: '#1b1e2c',
      border: '#242738',
      borderSoft: '#1e2130',
      text: '#e3e5ef',
      muted: '#8a90a3',
      faint: '#5f6478',
      accent: '#5b7bf8',
      accentSoft: 'rgba(91, 123, 248, 0.16)',
      blue: '#6ea8fe',
      ok: '#30a46c',
      warn: '#f5a524',
      err: '#f2555a',
      radius: '4px',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.40)',
    },
  },
] as const satisfies readonly ThemeDefinition[]

export type AppTheme = (typeof THEMES)[number]['id']

/** Vuetify 的默认主题（界面偏好见 stores/ui.ts，可以跟随系统） */
export const DEFAULT_THEME: AppTheme = 'kestrelLight'

/** 界面偏好：白天 / 跟随系统 / 黑夜。跟随系统时按系统亮暗选上面两套之一。 */
export type ThemePreference = 'light' | 'system' | 'dark'

export const THEME_PREFERENCES: { value: ThemePreference; labelKey: string }[] = [
  { value: 'light', labelKey: 'theme.light' },
  { value: 'system', labelKey: 'theme.system' },
  { value: 'dark', labelKey: 'theme.dark' },
]

export const DEFAULT_PREFERENCE: ThemePreference = 'system'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'system' || value === 'dark'
}

/** 把偏好解析成真正要用的那套色值 */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches,
): AppTheme {
  if (preference === 'system') return prefersDark ? 'kestrelDark' : 'kestrelLight'
  return preference === 'dark' ? 'kestrelDark' : 'kestrelLight'
}

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
  // 让浏览器原生控件（滚动条、输入框）也跟着亮暗
  root.style.setProperty('color-scheme', theme.dark ? 'dark' : 'light')
  root.dataset.theme = theme.dark ? 'dark' : 'light'
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
