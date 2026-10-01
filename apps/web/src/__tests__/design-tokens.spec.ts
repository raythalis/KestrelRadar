import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME,
  THEMES,
  applyThemeVars,
  cssVars,
  findTheme,
  vuetifyColors,
} from '@/design/tokens'
import i18n from '@/plugins/i18n'

const COLOR = /^(#[0-9a-f]{6}|rgba?\([^)]+\))$/i

describe('design tokens', () => {
  it('主题 id 唯一，默认主题在列表里', () => {
    const ids = THEMES.map((theme) => theme.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findTheme(DEFAULT_THEME)).toBeDefined()
    expect(ids.length).toBeGreaterThanOrEqual(2)
  })

  it('每套主题都提供同一组色值，且都是合法颜色', () => {
    const [first, ...rest] = THEMES
    const keys = Object.keys(first.tokens).sort()
    for (const theme of rest) {
      expect(Object.keys(theme.tokens).sort()).toEqual(keys)
    }
    for (const theme of THEMES) {
      const { radius, shadow, ...colors } = theme.tokens
      expect(radius.length).toBeGreaterThan(0)
      expect(shadow.length).toBeGreaterThan(0)
      for (const [name, value] of Object.entries(colors)) {
        expect(value, `${theme.id}.${name}`).toMatch(COLOR)
      }
    }
  })

  it('每套主题的切换文案都翻译过', () => {
    for (const theme of THEMES) {
      expect(i18n.global.t(theme.labelKey)).not.toBe(theme.labelKey)
    }
  })

  it('cssVars 把每个色值映成 --k-* 变量', () => {
    const theme = THEMES[0]
    const vars = cssVars(theme.tokens)
    const keys = Object.keys(theme.tokens)
    expect(Object.keys(vars)).toHaveLength(keys.length)
    for (const name of Object.keys(vars)) {
      expect(name.startsWith('--k-')).toBe(true)
    }
    expect(vars['--k-bg']).toBe(theme.tokens.bg)
    expect(vars['--k-accent']).toBe(theme.tokens.accent)
  })

  it('Vuetify 主题色同样来自色值，不另外写死', () => {
    for (const theme of THEMES) {
      const colors = vuetifyColors(theme)
      expect(colors.background).toBe(theme.tokens.bg)
      expect(colors.surface).toBe(theme.tokens.panel)
      expect(colors.primary).toBe(theme.tokens.accent)
      expect(colors.error).toBe(theme.tokens.err)
      for (const key of ['background', 'surface', 'primary', 'success', 'warning', 'error']) {
        expect(colors[key]).toBeTruthy()
      }
    }
  })

  it('切主题时把变量写到根节点（弹窗也能继承）', () => {
    const theme = THEMES[1]
    applyThemeVars(theme)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--k-bg')).toBe(theme.tokens.bg)
    expect(root.style.getPropertyValue('--k-panel-2')).toBe(theme.tokens.panel2)
  })
})
