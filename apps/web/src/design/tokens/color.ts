// Design System · Foundation 第一层：颜色
//
// 这里是全项目唯一写色值的地方。组件只认 CSS 变量 --k-*；
// Vuetify 主题色也由这里生成，不另写一份。
//
// 加一套颜色模板：在 THEMES 里加一条即可（记得补 theme.<id> 文案）；
// 形状与排版在 foundation.ts，两层的变量名都在 index.ts 里注入。

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
  /** 压在强调色上的文字色（亮色主题用白，暗色主题用深色，保证主要按钮的文字够清楚） */
  onAccent: string
  /** 第二强调色（链接、信息） */
  blue: string
  /** 正常状态 */
  ok: string
  /** 需要注意 */
  warn: string
  /** 出错状态 */
  err: string
  /** 圆角（历史遗留：形状现在归 foundation.ts，这里只为兼容旧注入） */
  radius: string
  /** 卡片阴影（同上，浮层阴影见 foundation.ts 的 ELEVATION） */
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
      muted: '#5b6472',
      faint: '#7c8593',
      accent: '#3b5cf0',
      accentSoft: 'rgba(59, 92, 240, 0.10)',
      onAccent: '#ffffff',
      blue: '#2f6fd0',
      ok: '#0b7d3d',
      warn: '#8a5d04',
      err: '#c62f34',
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
      muted: '#9aa2b4',
      faint: '#78808f',
      accent: '#5b7bf8',
      accentSoft: 'rgba(91, 123, 248, 0.16)',
      onAccent: '#0c0e15',
      blue: '#6ea8fe',
      ok: '#3fb87a',
      warn: '#e0a33e',
      err: '#f2555a',
      radius: '4px',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.40)',
    },
  },
] as const satisfies readonly ThemeDefinition[]

export type AppTheme = (typeof THEMES)[number]['id']

/** Vuetify 的默认主题（界面偏好见 stores/ui.ts，可以跟随系统） */
export const DEFAULT_THEME: AppTheme = 'kestrelLight'

/** 界面偏好：白天 / 跟随系统 / 黑夜 */
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
export const COLOR_VAR_NAMES: Record<keyof ThemeTokens, string> = {
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
  onAccent: '--k-on-accent',
  blue: '--k-blue',
  ok: '--k-ok',
  warn: '--k-warn',
  err: '--k-err',
  radius: '--k-radius',
  shadow: '--k-shadow',
}

export function colorVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, name] of Object.entries(COLOR_VAR_NAMES)) {
    vars[name] = tokens[key as keyof ThemeTokens]
  }
  return vars
}
