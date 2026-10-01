import { describe, expect, it } from 'vitest'

import {
  BREAKPOINTS,
  DENSITY,
  ELEVATION,
  PAGE_WIDTHS,
  RADIUS,
  SPACE,
  THEMES,
  TYPE,
  applyThemeVars,
  foundationVars,
  pageWidthVar,
  themeVars,
  type ThemeDefinition,
} from '@/design/tokens'

/** WCAG 相对亮度与对比度，用来守住"文字读得清"这条底线 */
function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const light = THEMES[0] as ThemeDefinition
const dark = THEMES[1] as ThemeDefinition

describe('Foundation · 色值对比度', () => {
  it('正文与次要文字在两种主题下都达标', () => {
    for (const theme of [light, dark] as ThemeDefinition[]) {
      const { tokens } = theme
      expect(contrast(tokens.text, tokens.bg)).toBeGreaterThanOrEqual(7)
      expect(contrast(tokens.text, tokens.panel)).toBeGreaterThanOrEqual(7)
      expect(contrast(tokens.muted, tokens.bg)).toBeGreaterThanOrEqual(4.5)
      expect(
        contrast(tokens.muted, tokens.panel),
        `${theme.id} 次要文字/卡片`,
      ).toBeGreaterThanOrEqual(4.5)
      // 最弱的提示文字只用于非关键信息，守住 3:1
      expect(contrast(tokens.faint, tokens.bg)).toBeGreaterThanOrEqual(3)
    }
  })

  it('状态色（强调 / 成功 / 提醒 / 错误）当文字用也达标', () => {
    for (const theme of [light, dark] as ThemeDefinition[]) {
      const { tokens } = theme
      for (const key of ['accent', 'ok', 'warn', 'err'] as const) {
        expect(
          contrast(tokens[key], tokens.bg),
          `${theme.id}.${key} 在背景上`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(tokens[key], tokens.panel),
          `${theme.id}.${key} 在卡片上`,
        ).toBeGreaterThanOrEqual(4.5)
      }
      // 主要按钮：压在强调色上的文字色（亮色白字 / 暗色深字）
      expect(contrast(tokens.onAccent, tokens.accent)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('Foundation · 形状与排版', () => {
  it('间距只有七档，且都是 4 的倍数', () => {
    expect(SPACE).toHaveLength(7)
    for (const value of SPACE) expect(value % 4).toBe(0)
  })

  it('字号阶梯递增，圆角四档齐全', () => {
    const sizes = Object.values(TYPE).map((v) => parseFloat(v))
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes)
    expect(Object.keys(RADIUS)).toEqual(['sm', 'md', 'lg', 'pill'])
  })

  it('阴影只留两级，两种主题都有值', () => {
    for (const theme of ['light', 'dark'] as const) {
      const set = ELEVATION[theme]
      expect(Object.keys(set)).toEqual(['1', '2'])
      expect(set['1'].length).toBeGreaterThan(0)
    }
  })

  it('密度值：按钮 32、输入框 40、触摸端 44，工具条高度单调', () => {
    expect(parseFloat(DENSITY.controlH)).toBeLessThanOrEqual(parseFloat(DENSITY.fieldH))
    expect(parseFloat(DENSITY.fieldH)).toBeLessThan(parseFloat(DENSITY.controlHTouch))
    expect(parseFloat(DENSITY.controlHTouch)).toBeGreaterThanOrEqual(44)
  })
})

describe('Foundation · 响应式与页面宽度', () => {
  it('断点递增，覆盖手机到宽屏', () => {
    const values = [BREAKPOINTS.sm, BREAKPOINTS.md, BREAKPOINTS.lg, BREAKPOINTS.xl]
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(BREAKPOINTS.sm).toBe(600)
    expect(BREAKPOINTS.md).toBe(900)
    expect(BREAKPOINTS.xl).toBe(1440)
  })

  it('页面宽度四档：narrow < default < wide，full 不限宽', () => {
    expect(PAGE_WIDTHS.narrow).toBeLessThan(PAGE_WIDTHS.default)
    expect(PAGE_WIDTHS.default).toBeLessThan(PAGE_WIDTHS.wide)
    expect(pageWidthVar('narrow')).toBe('var(--k-page-narrow)')
    expect(pageWidthVar('full')).toBe('none')
  })
})

describe('Foundation · 变量注入', () => {
  it('一套主题的变量 = 色值 + 基础层，全部是 --k-*', () => {
    const theme = light as ThemeDefinition
    const vars = themeVars(theme)
    const names = Object.keys(vars)
    expect(names.every((n) => n.startsWith('--k-'))).toBe(true)
    expect(vars['--k-bg']).toBe(theme.tokens.bg)
    expect(vars['--k-space-3']).toBe('12px')
    expect(vars['--k-fs-body']).toBe(TYPE.body)
    expect(vars['--k-field-h']).toBe(DENSITY.fieldH)
    expect(vars['--k-radius-md']).toBe(RADIUS.md)
    expect(vars['--k-page-wide']).toBe(`${PAGE_WIDTHS.wide}px`)
    expect(vars['--k-bp-md']).toBe(`${BREAKPOINTS.md}px`)
    expect(vars['--k-font-mono']).toBeDefined()
  })

  it('亮暗两套的阴影变量不同（同一份注入逻辑）', () => {
    expect(foundationVars(true)['--k-elev-2']).not.toBe(foundationVars(false)['--k-elev-2'])
  })

  it('applyThemeVars 把变量写到 <html> 上，并标记亮暗', () => {
    const theme = dark as ThemeDefinition
    applyThemeVars(theme)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--k-bg')).toBe(theme.tokens.bg)
    expect(root.style.getPropertyValue('--k-space-3')).toBe('12px')
    expect(root.dataset.theme).toBe('dark')
    // 浮层不在 <v-app> 里，主题类名必须也挂在 <html> 上
    expect(root.classList.contains('v-theme--kestrelDark')).toBe(true)
    expect(root.classList.contains('v-theme--kestrelLight')).toBe(false)
  })
})
