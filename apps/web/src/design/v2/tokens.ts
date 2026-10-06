// Design System · 唯一 token source（正式体系）
//
// 全项目只在这里定义视觉数值：颜色、字号、行高、字重、间距、圆角、阴影、密度、布局、
// 页面宽度、图标、动效、断点、主题清单、Vuetify 色板。注入成 --k2-*，Vuetify 主题与
// 组件层都从这一份生成，不再有第二份色值。
//
// v1 的名字（--k-*）只保留在 legacyVars() 这一层兼容别名里，值全部指向 --k2-*：
// 还有 12 个零生产引用的 App 组件在吃旧名字，等它们处理完，整块删除。
//
// 设计取向：参照图那种消费级观感 —— 大圆角、柔和分层阴影、明亮语义色配柔和底、
// 宽松留白、字号整体上调一档、动效有统一的缓动。信息仍是运维内容，但呈现方式按产品级来。
//
// 落地路径：预览确认后，整套并入 design/tokens（替换而不是并存），届时 --k2-* 改名 --k-*。

/* ------------------------------------------------------------------ 颜色 */

export interface V2ColorTokens {
  /** 页面底色 */
  bg: string
  /** 卡片/面板底色 */
  surface: string
  /** 卡内次级块 */
  surface2: string
  /** 更深的次级块（表头、代码块） */
  surface3: string
  /** 常规描边 */
  border: string
  /** 更淡的分隔线 */
  borderSoft: string
  /** 正文 */
  text: string
  /** 次要文字 */
  textMuted: string
  /** 最弱提示文字 */
  textFaint: string
  /** 品牌主色 / 悬停 / 按下 */
  primary: string
  primaryHover: string
  primaryActive: string
  /** 品牌色柔和底 */
  primarySoft: string
  /** 柔和底上的品牌色文字（保证小字号也能看清） */
  primaryInk: string
  /** 压在品牌色上的文字 */
  onPrimary: string
  /* 语义色：实色用于图标与条形，ink 用于柔和底上的文字（保证对比度） */
  success: string
  successSoft: string
  successInk: string
  warning: string
  warningSoft: string
  warningInk: string
  danger: string
  dangerSoft: string
  dangerInk: string
  info: string
  infoSoft: string
  infoInk: string
  /* 状态与辅助：焦点、遮罩、禁用、加载、进度、关联高亮、悬停叠色 */
  /** 键盘焦点环 */
  focusRing: string
  /** 弹窗遮罩底 */
  overlay: string
  disabledBg: string
  disabledText: string
  /** 加载骨架的底色与扫光 */
  skeleton: string
  skeletonSheen: string
  /** 进度条 / 柱状图的底色轨道 */
  track: string
  /** 关联高亮：桌面端点一项，同组其他项一起亮起来 */
  mark: string
  markBorder: string
  /** 悬停叠色（列表行、幽灵按钮） */
  washHover: string
}

/** 中性阶：冷调纯净灰，比 v1 的灰更亮更干净 */
export const V2_NEUTRAL = {
  n0: '#ffffff',
  n25: '#fcfcfd',
  n50: '#f6f7fb',
  n100: '#f1f3f8',
  n200: '#e7e9f0',
  n300: '#d5d8e3',
  n400: '#a8aebd',
  n500: '#767e8f',
  n600: '#5a6172',
  n700: '#3d4350',
  n800: '#262a35',
  n900: '#131722',
} as const

/** 品牌色：靛紫，比 v1 的深靛蓝更亮、更偏产品化；deep 只用于渐变 */
export const V2_BRAND = {
  base: '#5b5ef0',
  hover: '#4f46e5',
  active: '#4338ca',
  deep: '#8b5cf6',
} as const

export const V2_COLOR: { light: V2ColorTokens; dark: V2ColorTokens } = {
  light: {
    bg: V2_NEUTRAL.n50,
    surface: V2_NEUTRAL.n0,
    surface2: '#f8f9fc',
    surface3: V2_NEUTRAL.n100,
    border: V2_NEUTRAL.n200,
    borderSoft: '#f0f2f7',
    text: V2_NEUTRAL.n900,
    textMuted: V2_NEUTRAL.n600,
    textFaint: '#6b7385',
    primary: V2_BRAND.base,
    primaryHover: V2_BRAND.hover,
    primaryActive: V2_BRAND.active,
    primarySoft: 'rgba(91, 94, 240, 0.10)',
    primaryInk: '#4338ca',
    onPrimary: '#ffffff',
    success: '#12b76a',
    successSoft: 'rgba(18, 183, 106, 0.12)',
    successInk: '#067647',
    warning: '#f79009',
    warningSoft: 'rgba(247, 144, 9, 0.14)',
    warningInk: '#b54708',
    danger: '#f04438',
    dangerSoft: 'rgba(240, 68, 56, 0.12)',
    dangerInk: '#b42318',
    info: '#2e90fa',
    infoSoft: 'rgba(46, 144, 250, 0.12)',
    infoInk: '#175cd3',
    focusRing: 'rgba(91, 94, 240, 0.45)',
    overlay: 'rgba(19, 23, 34, 0.44)',
    disabledBg: '#f1f3f8',
    disabledText: '#a8aebd',
    skeleton: '#eef0f6',
    skeletonSheen: 'rgba(255, 255, 255, 0.72)',
    track: '#e9ecf3',
    mark: 'rgba(91, 94, 240, 0.12)',
    markBorder: 'rgba(91, 94, 240, 0.34)',
    washHover: 'rgba(19, 23, 34, 0.04)',
  },
  dark: {
    bg: '#0b0d13',
    surface: '#14171f',
    surface2: '#1b1f28',
    surface3: '#222731',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSoft: 'rgba(255, 255, 255, 0.05)',
    text: '#f1f3f8',
    textMuted: '#a7aebe',
    textFaint: '#7b8395',
    primary: V2_BRAND.base,
    primaryHover: '#7a7bfa',
    primaryActive: '#5b5be0',
    primarySoft: 'rgba(91, 94, 240, 0.18)',
    primaryInk: '#a5b4fc',
    onPrimary: '#ffffff',
    success: '#32d583',
    successSoft: 'rgba(50, 213, 131, 0.16)',
    successInk: '#a6f4c5',
    warning: '#fdb022',
    warningSoft: 'rgba(253, 176, 34, 0.16)',
    warningInk: '#fec84b',
    danger: '#f97066',
    dangerSoft: 'rgba(249, 112, 102, 0.16)',
    dangerInk: '#fda29b',
    info: '#53b1fd',
    infoSoft: 'rgba(83, 177, 253, 0.16)',
    infoInk: '#b2ddff',
    focusRing: 'rgba(122, 123, 250, 0.55)',
    overlay: 'rgba(0, 0, 0, 0.62)',
    disabledBg: 'rgba(255, 255, 255, 0.06)',
    disabledText: '#7b8395',
    skeleton: 'rgba(255, 255, 255, 0.07)',
    skeletonSheen: 'rgba(255, 255, 255, 0.12)',
    track: 'rgba(255, 255, 255, 0.09)',
    mark: 'rgba(122, 123, 250, 0.20)',
    markBorder: 'rgba(122, 123, 250, 0.46)',
    washHover: 'rgba(255, 255, 255, 0.05)',
  },
}

/* ------------------------------------------------------------------ 排版 */

/**
 * 字号阶梯：主体比 v1 上调一档（v1 是 11/12/13/14/16/20/24）。
 * 小字端补两档：密集列表（事件行 / 异常卡）需要比 caption 更小的层级，
 * 否则信息密度拉不开，只能靠缩间距，观感会和参考稿差一截。
 */
export const V2_TYPE = {
  micro: '10px',
  label: '11px',
  caption: '12px',
  body: '14px',
  bodyLg: '16px',
  subtitle: '18px',
  title: '20px',
  h2: '24px',
  h1: '32px',
  display: '40px',
} as const

/** 行高四档 */
export const V2_LEADING = { tight: '1.25', snug: '1.4', normal: '1.6', relaxed: '1.75' } as const

/** 字重：开放 700（v1 只到 600） */
export const V2_WEIGHT = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const

/* ------------------------------------------------------------------ 形状与层级 */

/** 圆角阶梯：比 v1 的 3/4/6 大一个量级 */
export const V2_RADIUS = {
  xs: '8px',
  sm: '10px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '999px',
} as const

/** 阴影五档：xs 极淡、sm 卡片静置、md 悬停、lg 浮层、xl 弹窗 */
export const V2_SHADOW = {
  light: {
    xs: '0 1px 2px rgba(19, 23, 34, 0.05)',
    sm: '0 1px 2px rgba(19, 23, 34, 0.04), 0 8px 20px rgba(19, 23, 34, 0.07)',
    md: '0 2px 6px rgba(19, 23, 34, 0.06), 0 16px 36px rgba(19, 23, 34, 0.12)',
    lg: '0 8px 24px rgba(19, 23, 34, 0.1), 0 32px 64px rgba(19, 23, 34, 0.16)',
    xl: '0 16px 48px rgba(19, 23, 34, 0.16), 0 48px 96px rgba(19, 23, 34, 0.22)',
    knob: '0 1px 2px rgba(13, 15, 26, 0.22), 0 2px 6px rgba(13, 15, 26, 0.12)',
  },
  dark: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.6)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.5), 0 10px 24px rgba(0, 0, 0, 0.45)',
    md: '0 2px 6px rgba(0, 0, 0, 0.55), 0 18px 40px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 28px rgba(0, 0, 0, 0.55), 0 36px 72px rgba(0, 0, 0, 0.6)',
    xl: '0 18px 52px rgba(0, 0, 0, 0.6), 0 52px 104px rgba(0, 0, 0, 0.65)',
    knob: '0 1px 2px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35)',
  },
} as const

/** 图标尺寸三档：MDI 走 font-size，页面与预览共用 */
export const V2_ICON = { sm: '16px', md: '20px', lg: '24px' } as const

/** 字距：只有标题收紧一档，正文不动 */
export const V2_LETTER = { tight: '-0.02em' } as const

/* ------------------------------------------------------------------ 间距与密度 */

/** 间距阶梯：最小 4，另有 20 / 40 / 64 这几档留白用值 */
export const V2_SPACE = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const

/** 密度：比 v1 整体放大（v1 是按钮 32 / 输入 40 / 行 36 / 卡内边距 16） */
export const V2_DENSITY = {
  controlH: '40px',
  controlHSm: '32px',
  fieldH: '44px',
  touchH: '48px',
  rowH: '52px',
  cardPad: '24px',
  cardPadSm: '18px',
  pagePad: '24px',
  pagePadMobile: '16px',
  gap: '20px',
  tile: '44px',
  tileSm: '32px',
  chipH: '26px',
} as const

/** 布局骨架尺寸：外壳的顶栏与侧栏，页面阶段直接用 */
export const V2_LAYOUT = { topbarH: '64px', sidebarW: '248px', sidebarRailW: '72px' } as const

/** 页面宽度上限：窄页 720 / 常规 1120 / 宽 1440（超宽屏内容不跟着无限拉长） */
/** 页面宽度上限：默认 1120（宽屏上收住正文），表单类窄页 720，列表类宽页 1440 */
export const V2_WIDTH = { narrow: '720px', default: '1120px', wide: '1440px' } as const

/* ------------------------------------------------------------------ 动效与字体 */

export const V2_MOTION = {
  fast: '120ms',
  base: '180ms',
  /** 统一缓动：先快后缓，产品级「顺滑感」主要来自这里 */
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
  /** 悬停抬升幅度：卡片抬这么高，不靠手感现写 */
  lift: '4px',
} as const

export const V2_FONT_SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif"
// 等宽栈尾部接的是 sans 系的中文字体：JetBrains Mono 只带 latin，
// 不接中文字体的话中文会落到浏览器的默认等宽中文（宋体那类），跟等宽英文混在一起很怪。
export const V2_FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif"

/* ------------------------------------------------------------------ 断点与主题清单 */

/** 断点：Vuetify display thresholds 与组件媒体查询都从这里取 */
export const V2_BREAKPOINTS = { sm: 600, md: 900, lg: 1280, xl: 1440 } as const

/** 主题清单：id 沿用历史值（localStorage 里存着偏好），亮暗由 V2_COLOR 决定 */
export const V2_THEMES = [
  { id: 'kestrelLight', dark: false, labelKey: 'theme.light' },
  { id: 'kestrelDark', dark: true, labelKey: 'theme.dark' },
] as const

export type AppTheme = (typeof V2_THEMES)[number]['id']

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

/** 把偏好解析成真正要用的那套主题 id */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches,
): AppTheme {
  if (preference === 'system') return prefersDark ? 'kestrelDark' : 'kestrelLight'
  return preference === 'dark' ? 'kestrelDark' : 'kestrelLight'
}

export function findTheme(id: string): (typeof V2_THEMES)[number] | undefined {
  return V2_THEMES.find((theme) => theme.id === id)
}

/** Vuetify 主题色：同一份 V2_COLOR 生成，不另写色值 */
export function vuetifyColors(dark: boolean): Record<string, string> {
  const c = V2_COLOR[dark ? 'dark' : 'light']
  return {
    background: c.bg,
    surface: c.surface,
    'surface-variant': c.surface2,
    'surface-bright': c.surface3,
    primary: c.primary,
    'on-primary': c.onPrimary,
    secondary: c.textMuted,
    accent: c.info,
    info: c.info,
    success: c.success,
    warning: c.warning,
    error: c.danger,
    'on-surface': c.text,
    'on-background': c.text,
  }
}

/* ------------------------------------------------------------------ 注入 */

const kebab = (key: string): string => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

/** 拍平成 --k2-* 变量；每个变量都在 styles/v2.scss 或预览页里被真正用到 */
export function v2Vars(dark: boolean): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [key, value] of Object.entries(V2_COLOR[dark ? 'dark' : 'light'])) {
    vars[`--k2-c-${kebab(key)}`] = value
  }
  for (const [key, value] of Object.entries(V2_NEUTRAL)) vars[`--k2-n-${key.slice(1)}`] = value
  for (const [key, value] of Object.entries(V2_TYPE)) vars[`--k2-fs-${key}`] = value
  for (const [key, value] of Object.entries(V2_LEADING)) vars[`--k2-lh-${key}`] = value
  for (const [key, value] of Object.entries(V2_WEIGHT)) vars[`--k2-fw-${key}`] = value
  for (const [key, value] of Object.entries(V2_RADIUS)) vars[`--k2-r-${key}`] = value
  for (const [key, value] of Object.entries(V2_SHADOW[dark ? 'dark' : 'light'])) {
    vars[`--k2-shadow-${key}`] = value
  }
  V2_SPACE.forEach((value, index) => {
    vars[`--k2-s-${index + 1}`] = `${value}px`
  })
  for (const [key, value] of Object.entries(V2_DENSITY)) vars[`--k2-${kebab(key)}`] = value
  for (const [key, value] of Object.entries(V2_LAYOUT)) vars[`--k2-${kebab(key)}`] = value
  for (const [key, value] of Object.entries(V2_WIDTH)) vars[`--k2-w-${key}`] = value
  for (const [key, value] of Object.entries(V2_ICON)) vars[`--k2-icon-${key}`] = value
  for (const [key, value] of Object.entries(V2_LETTER)) vars[`--k2-ls-${key}`] = value
  for (const [key, value] of Object.entries(V2_MOTION)) {
    // lift 是距离不是时长，单独一个名字
    vars[key === 'lift' ? '--k2-lift' : `--k2-motion-${key}`] = value
  }

  vars['--k2-font-sans'] = V2_FONT_SANS
  vars['--k2-font-mono'] = V2_FONT_MONO
  /** 品牌渐变：只用在英雄数值的强调条与选中态上 */
  vars['--k2-grad-brand'] = `linear-gradient(135deg, ${V2_BRAND.base}, ${V2_BRAND.deep})`
  /** 卡片顶部的极淡品牌色晕：消费级观感的主要来源之一 */
  vars['--k2-grad-wash'] = dark
    ? 'linear-gradient(180deg, rgba(91, 94, 240, 0.10), rgba(91, 94, 240, 0) 62%)'
    : 'linear-gradient(180deg, rgba(91, 94, 240, 0.07), rgba(91, 94, 240, 0) 62%)'
  return vars
}

/** 把 v2 变量写到指定元素（默认 <html>）；预览页只写到预览容器，不外溢 */
export function applyV2Vars(dark: boolean, target?: HTMLElement): void {
  const el = target ?? document.documentElement
  for (const [name, value] of Object.entries(v2Vars(dark))) el.style.setProperty(name, value)
}

/**
 * 兼容别名：v1 的名字只在这里出现，值全部指向 --k2-*。
 * B1 已删除 6 个零生产引用的 App 组件（AppCard / AppDialog / AppPage / AppSection /
 * AppTag / AppTagsInput）。B2 已完成剩余 6 个（AppEmptyState / AppHint / AppSkeleton /
 * AppStatus / AppTabs / AppTextarea）的 V2 化，它们不再消费 --k-*。
 * 别名表本批按要求保留（不删除）；仍在消费它的是 components.scss / main.scss 两个
 * 遗留样式文件与 app-field / app-btn 等旧 class（守卫测试见 token-guard.spec.ts）。
 */
export const LEGACY_VARS: Record<string, string> = {
  /* 颜色 */
  '--k-bg': 'var(--k2-c-bg)',
  '--k-rail': 'var(--k2-c-surface)',
  '--k-panel': 'var(--k2-c-surface)',
  '--k-panel-2': 'var(--k2-c-surface2)',
  '--k-border': 'var(--k2-c-border)',
  '--k-border-soft': 'var(--k2-c-border-soft)',
  '--k-text': 'var(--k2-c-text)',
  '--k-muted': 'var(--k2-c-text-muted)',
  '--k-faint': 'var(--k2-c-text-faint)',
  '--k-accent': 'var(--k2-c-primary)',
  '--k-accent-soft': 'var(--k2-c-primary-soft)',
  '--k-on-accent': 'var(--k2-c-on-primary)',
  '--k-blue': 'var(--k2-c-info)',
  '--k-ok': 'var(--k2-c-success)',
  '--k-warn': 'var(--k2-c-warning)',
  '--k-err': 'var(--k2-c-danger)',
  /* 形状与层级 */
  '--k-radius': 'var(--k2-r-md)',
  '--k-radius-sm': 'var(--k2-r-xs)',
  '--k-radius-md': 'var(--k2-r-md)',
  '--k-radius-lg': 'var(--k2-r-lg)',
  '--k-radius-pill': 'var(--k2-r-full)',
  '--k-shadow': 'var(--k2-shadow-sm)',
  '--k-elev-1': 'var(--k2-shadow-lg)',
  '--k-elev-2': 'var(--k2-shadow-xl)',
  /* 排版 */
  '--k-font-sans': 'var(--k2-font-sans)',
  '--k-font-mono': 'var(--k2-font-mono)',
  '--k-fs-label': 'var(--k2-fs-caption)',
  '--k-fs-meta': 'var(--k2-fs-caption)',
  '--k-fs-body': 'var(--k2-fs-body)',
  '--k-fs-bodyLg': 'var(--k2-fs-body)',
  '--k-fs-title': 'var(--k2-fs-body-lg)',
  '--k-fs-h1': 'var(--k2-fs-title)',
  '--k-fs-display': 'var(--k2-fs-h2)',
  '--k-lh-tight': 'var(--k2-lh-tight)',
  '--k-lh-normal': 'var(--k2-lh-normal)',
  '--k-fw-regular': 'var(--k2-fw-regular)',
  '--k-fw-medium': 'var(--k2-fw-medium)',
  '--k-fw-semibold': 'var(--k2-fw-semibold)',
  /* 间距（按值对齐：v1 七档 4/8/12/16/24/32/48 → v2 的 1/2/3/4/6/7/9 档） */
  '--k-space-1': 'var(--k2-s-1)',
  '--k-space-2': 'var(--k2-s-2)',
  '--k-space-3': 'var(--k2-s-3)',
  '--k-space-4': 'var(--k2-s-4)',
  '--k-space-5': 'var(--k2-s-6)',
  '--k-space-6': 'var(--k2-s-7)',
  '--k-space-7': 'var(--k2-s-9)',
  /* 密度 */
  '--k-control-h': 'var(--k2-control-h)',
  '--k-control-h-touch': 'var(--k2-touch-h)',
  '--k-field-h': 'var(--k2-field-h)',
  '--k-row-h': 'var(--k2-row-h)',
  '--k-pad-card': 'var(--k2-card-pad)',
  '--k-pad-card-lg': 'var(--k2-card-pad)',
  '--k-pad-page': 'var(--k2-page-pad)',
  '--k-pad-page-mobile': 'var(--k2-page-pad-mobile)',
  /* 页面宽度（断点只走 TS 常量：给 Vuetify thresholds 与媒体查询用，不发 CSS 变量） */
  '--k-page-narrow': 'var(--k2-w-narrow)',
  '--k-page-default': 'var(--k2-w-default)',
  '--k-page-wide': 'var(--k2-w-wide)',
}

/**
 * 把当前主题装到 <html> 上：v2 变量 + 兼容别名 + Vuetify 主题类。
 * 弹窗、菜单会被传送到 body，挂在根节点才不会掉色；v-theme--<id> 那个类也必须跟着挂，
 * 否则浮层会掉回 Vuetify 的默认亮色。
 */
export function applyV2Theme(dark: boolean): void {
  const root = document.documentElement
  applyV2Vars(dark)
  for (const [name, value] of Object.entries(LEGACY_VARS)) root.style.setProperty(name, value)
  root.style.setProperty('color-scheme', dark ? 'dark' : 'light')
  root.dataset.theme = dark ? 'dark' : 'light'
  for (const item of V2_THEMES) root.classList.toggle(`v-theme--${item.id}`, item.dark === dark)
}
