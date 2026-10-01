// Design System · Foundation 第二层：形状、排版、间距、断点、页面宽度
//
// 这里只写"数值规则"，不写颜色。所有值最终都会被注入成 --k-* 变量，
// 组件与页面只消费变量，不自己定数值。
//
// 一条硬规则：间距只用 4px 的倍数（SPACE 里那七档），不要出现 10px / 14px 这种随手值。

/** 间距阶梯（4px 基准） */
export const SPACE = [4, 8, 12, 16, 24, 32, 48] as const

/** 圆角四档：小徽标 / 常规控件与卡片 / 浮层 / 完全圆 */
export const RADIUS = { sm: '3px', md: '4px', lg: '6px', pill: '999px' } as const

/** 字号阶梯：小标签 / 次要文字 / 正文 / 大正文 / 小标题 / 页面标题 / 数字 */
export const TYPE = {
  label: '11px',
  meta: '12px',
  body: '13px',
  bodyLg: '14px',
  title: '16px',
  h1: '20px',
  display: '24px',
} as const

/** 行高与字重（字重只用三档，避免页面自己加粗到 700） */
export const LINE_HEIGHT = { tight: '1.3', normal: '1.5' } as const
export const WEIGHT = { regular: '400', medium: '500', semibold: '600' } as const

/**
 * 阴影只留两级，且只给浮层用：
 * 1 = 菜单/气泡，2 = 弹窗/抽屉。卡片不用阴影，靠边框与底色分层。
 */
export const ELEVATION = {
  light: {
    1: '0 2px 8px rgba(13, 15, 26, 0.08)',
    2: '0 12px 32px rgba(13, 15, 26, 0.16)',
  },
  dark: {
    1: '0 2px 8px rgba(0, 0, 0, 0.45)',
    2: '0 14px 40px rgba(0, 0, 0, 0.55)',
  },
} as const

/**
 * 密度：按钮 32、输入框 40、触摸端一律 44。
 * 页面不许自己写高度，统一用这几个变量（真机实测值记录在 docs/design/foundation.md）。
 */
export const DENSITY = {
  /** 按钮、小控件的高度 */
  controlH: '32px',
  /** 输入框/选择框的高度（Vuetify density: compact 实测 40px，与这里对齐） */
  fieldH: '40px',
  /** 触摸端：按钮、输入框、列表行都抬到 44 */
  controlHTouch: '44px',
  rowH: '36px',
  cardPad: '16px',
  cardPadLg: '20px',
  pagePad: '32px',
  pagePadMobile: '16px',
} as const

/** 断点：手机 390 / 大手机 600 / 桌面布局 900 / 宽屏 1440 */
export const BREAKPOINTS = { sm: 600, md: 900, lg: 1280, xl: 1440 } as const

/**
 * 页面内容宽度策略（AppPage 的能力，不是全局写死一个 max-width）：
 * - narrow：表单、设置、单列内容（不随屏幕变宽）
 * - default：大多数页面
 * - wide：仪表盘、多列配置
 * - full：确实要占满的页面（不限宽）
 * 具体像素以真机截图为准，可调。
 */
export const PAGE_WIDTHS = { narrow: 720, default: 1120, wide: 1440, full: 0 } as const

export type AppPageWidth = keyof typeof PAGE_WIDTHS

/** 字体：先用系统字体栈（P0 决定），等视觉检查说不够再单独评估 webfont */
export const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif"
export const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', monospace"

/** 把所有形状类数值拍平成 --k-* 变量 */
export function foundationVars(dark: boolean): Record<string, string> {
  const vars: Record<string, string> = {}
  SPACE.forEach((value, index) => {
    vars[`--k-space-${index + 1}`] = `${value}px`
  })
  for (const [key, value] of Object.entries(RADIUS)) vars[`--k-radius-${key}`] = value
  for (const [key, value] of Object.entries(TYPE)) vars[`--k-fs-${key}`] = value
  vars['--k-lh-tight'] = LINE_HEIGHT.tight
  vars['--k-lh-normal'] = LINE_HEIGHT.normal
  for (const [key, value] of Object.entries(WEIGHT)) vars[`--k-fw-${key}`] = value
  for (const [key, value] of Object.entries(ELEVATION[dark ? 'dark' : 'light'])) {
    vars[`--k-elev-${key}`] = value
  }
  vars['--k-control-h'] = DENSITY.controlH
  vars['--k-field-h'] = DENSITY.fieldH
  vars['--k-control-h-touch'] = DENSITY.controlHTouch
  vars['--k-row-h'] = DENSITY.rowH
  vars['--k-pad-card'] = DENSITY.cardPad
  vars['--k-pad-card-lg'] = DENSITY.cardPadLg
  vars['--k-pad-page'] = DENSITY.pagePad
  vars['--k-pad-page-mobile'] = DENSITY.pagePadMobile
  vars['--k-bp-sm'] = `${BREAKPOINTS.sm}px`
  vars['--k-bp-md'] = `${BREAKPOINTS.md}px`
  vars['--k-bp-lg'] = `${BREAKPOINTS.lg}px`
  vars['--k-bp-xl'] = `${BREAKPOINTS.xl}px`
  vars['--k-page-narrow'] = `${PAGE_WIDTHS.narrow}px`
  vars['--k-page-default'] = `${PAGE_WIDTHS.default}px`
  vars['--k-page-wide'] = `${PAGE_WIDTHS.wide}px`
  vars['--k-font-sans'] = FONT_SANS
  vars['--k-font-mono'] = FONT_MONO
  return vars
}

/** 页面宽度对应的 CSS 变量名（AppPage 用） */
export function pageWidthVar(width: AppPageWidth): string {
  return PAGE_WIDTHS[width] > 0 ? `var(--k-page-${width})` : 'none'
}
