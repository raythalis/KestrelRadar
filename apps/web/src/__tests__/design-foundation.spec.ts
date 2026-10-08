import { describe, expect, it } from 'vitest'

import {
  LEGACY_VARS,
  V2_BREAKPOINTS,
  V2_DENSITY,
  V2_LAYOUT,
  V2_MOTION,
  V2_RADIUS,
  V2_SHADOW,
  V2_SPACE,
  V2_TYPE,
  V2_WIDTH,
  v2Vars,
} from '@/design/v2/tokens'

const numeric = (value: string): number => parseFloat(value)

describe('v2 Foundation · 形状与排版', () => {
  it('间距十档、都是 4 的倍数、严格递增', () => {
    expect(V2_SPACE).toHaveLength(10)
    for (const value of V2_SPACE) expect(value % 4).toBe(0)
    expect([...V2_SPACE].sort((a, b) => a - b)).toEqual([...V2_SPACE])
  })

  it('字号阶梯递增，圆角七档递增', () => {
    const sizes = Object.values(V2_TYPE).map(numeric)
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes)
    const radii = Object.entries(V2_RADIUS)
      .filter(([key]) => key !== 'full')
      .map(([, v]) => numeric(v))
    expect([...radii].sort((a, b) => a - b)).toEqual(radii)
    expect(V2_RADIUS.full).toBe('999px')
  })

  it('阴影亮暗两套键一致，都只有非空字符串', () => {
    expect(Object.keys(V2_SHADOW.dark).sort()).toEqual(Object.keys(V2_SHADOW.light).sort())
    for (const theme of ['light', 'dark'] as const) {
      for (const [key, value] of Object.entries(V2_SHADOW[theme])) {
        expect(value.length, `${theme}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('密度：按钮 ≤ 输入框 < 触摸端，触摸端不小于 44', () => {
    expect(numeric(V2_DENSITY.controlH)).toBeLessThanOrEqual(numeric(V2_DENSITY.fieldH))
    expect(numeric(V2_DENSITY.fieldH)).toBeLessThan(numeric(V2_DENSITY.touchH))
    expect(numeric(V2_DENSITY.touchH)).toBeGreaterThanOrEqual(44)
    expect(numeric(V2_DENSITY.cardPad)).toBeGreaterThan(numeric(V2_DENSITY.cardPadSm))
  })

  it('外壳骨架尺寸与页面宽度档位都在 token 里', () => {
    expect(numeric(V2_LAYOUT.topbarH)).toBeGreaterThanOrEqual(56)
    expect(numeric(V2_LAYOUT.sidebarW)).toBeGreaterThan(numeric(V2_LAYOUT.sidebarRailW))
    expect(numeric(V2_WIDTH.narrow)).toBeLessThan(numeric(V2_WIDTH.default))
    expect(numeric(V2_WIDTH.default)).toBeLessThan(numeric(V2_WIDTH.wide))
  })

  it('动效：两档时长递增，缓动统一', () => {
    expect(numeric(V2_MOTION.fast)).toBeLessThan(numeric(V2_MOTION.base))
    expect(V2_MOTION.ease).toContain('cubic-bezier')
  })
})

describe('v2 Foundation · 响应式与页面宽度', () => {
  it('断点递增，覆盖手机到宽屏（与 Vuetify thresholds 同源）', () => {
    const values = [V2_BREAKPOINTS.sm, V2_BREAKPOINTS.md, V2_BREAKPOINTS.lg, V2_BREAKPOINTS.xl]
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(V2_BREAKPOINTS.sm).toBe(600)
    expect(V2_BREAKPOINTS.md).toBe(900)
    expect(V2_BREAKPOINTS.xl).toBe(1440)
  })

  it('页面宽度变量：narrow < default < wide', () => {
    const vars = v2Vars(false)
    expect(vars['--k2-w-narrow']).toBe(`${V2_WIDTH.narrow}`)
    expect(vars['--k2-w-default']).toBe(`${V2_WIDTH.default}`)
    expect(vars['--k2-w-wide']).toBe(`${V2_WIDTH.wide}`)
  })
})

describe('v2 Foundation · 变量注入', () => {
  it('一套变量：全部是 --k2-*，关键值来自 token', () => {
    const vars = v2Vars(false)
    const names = Object.keys(vars)
    expect(names.every((name) => name.startsWith('--k2-'))).toBe(true)
    expect(vars['--k2-c-bg']).toBeTruthy()
    expect(vars['--k2-s-3']).toBe('12px')
    expect(vars['--k2-fs-body']).toBe(V2_TYPE.body)
    expect(vars['--k2-field-h']).toBe(V2_DENSITY.fieldH)
    expect(vars['--k2-r-md']).toBe(V2_RADIUS.md)
    expect(vars['--k2-font-mono']).toBeDefined()
  })

  it('亮暗两套的阴影变量不同（同一份注入逻辑）', () => {
    expect(v2Vars(true)['--k2-shadow-lg']).not.toBe(v2Vars(false)['--k2-shadow-lg'])
  })

  it('兼容别名按值对齐旧间距档位（v1 的 space-5 = 24px = v2 的 s-6）', () => {
    expect(LEGACY_VARS['--k-space-3']).toBe('var(--k2-s-3)')
    expect(LEGACY_VARS['--k-space-5']).toBe('var(--k2-s-6)')
    expect(LEGACY_VARS['--k-radius-md']).toBe('var(--k2-r-md)')
    expect(LEGACY_VARS['--k-control-h']).toBe('var(--k2-control-h)')
  })
})
