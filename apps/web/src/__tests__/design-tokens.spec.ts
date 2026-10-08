import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME,
  LEGACY_VARS,
  V2_COLOR,
  V2_THEMES,
  applyV2Theme,
  findTheme,
  vuetifyColors,
} from '@/design/v2/tokens'
import i18n from '@/plugins/i18n'

const COLOR = /^(#[0-9a-f]{6}|rgba?\([^)]+\))$/i

describe('design tokens · v2（唯一 source）', () => {
  it('主题 id 唯一，默认主题在列表里', () => {
    const ids = V2_THEMES.map((theme) => theme.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findTheme(DEFAULT_THEME)).toBeDefined()
    expect(ids).toHaveLength(2)
  })

  it('亮暗两套色值键一致，且都是合法颜色', () => {
    const keys = Object.keys(V2_COLOR.light).sort()
    expect(Object.keys(V2_COLOR.dark).sort()).toEqual(keys)
    for (const theme of ['light', 'dark'] as const) {
      for (const [name, value] of Object.entries(V2_COLOR[theme])) {
        expect(value, `${theme}.${name}`).toMatch(COLOR)
      }
    }
  })

  it('每套主题的切换文案都翻译过', () => {
    for (const theme of V2_THEMES) {
      expect(i18n.global.t(theme.labelKey)).not.toBe(theme.labelKey)
    }
  })

  it('Vuetify 色板由 V2_COLOR 生成，不另外写死一份', () => {
    for (const dark of [false, true]) {
      const tokens = V2_COLOR[dark ? 'dark' : 'light']
      const colors = vuetifyColors(dark)
      expect(colors.background).toBe(tokens.bg)
      expect(colors.surface).toBe(tokens.surface)
      expect(colors.primary).toBe(tokens.primary)
      expect(colors.error).toBe(tokens.danger)
      expect(colors.success).toBe(tokens.success)
      expect(colors.warning).toBe(tokens.warning)
      for (const key of ['background', 'surface', 'primary', 'success', 'warning', 'error']) {
        expect(colors[key]).toBeTruthy()
      }
    }
  })

  it('切主题：写 --k2-* 与兼容别名到 <html>，并标记亮暗与 Vuetify 主题类', () => {
    const root = document.documentElement
    applyV2Theme(true)
    expect(root.style.getPropertyValue('--k2-c-bg')).toBe(V2_COLOR.dark.bg)
    expect(root.style.getPropertyValue('--k2-w-default')).toBe('1120px')
    expect(root.style.getPropertyValue('--k-bg')).toBe('var(--k2-c-bg)')
    expect(root.dataset.theme).toBe('dark')
    // 浮层不在 <v-app> 里，主题类名必须也挂在 <html> 上
    expect(root.classList.contains('v-theme--kestrelDark')).toBe(true)
    expect(root.classList.contains('v-theme--kestrelLight')).toBe(false)

    applyV2Theme(false)
    expect(root.style.getPropertyValue('--k2-c-bg')).toBe(V2_COLOR.light.bg)
    expect(root.dataset.theme).toBe('light')
    expect(root.classList.contains('v-theme--kestrelLight')).toBe(true)
  })

  it('兼容别名一律指向 --k2-*，不许再写字面色值', () => {
    for (const [name, value] of Object.entries(LEGACY_VARS)) {
      expect(name.startsWith('--k-')).toBe(true)
      expect(name.startsWith('--k2-')).toBe(false)
      expect(value).toMatch(/^var\(--k2-[a-z0-9-]+\)$/)
    }
  })
})
