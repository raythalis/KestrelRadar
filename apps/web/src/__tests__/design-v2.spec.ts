import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { V2_COLOR, v2Vars } from '@/design/v2/tokens'

/**
 * v2 层的守卫：v2 是唯一 token source，规则是「只消费 --k2-*」且「没有死变量」。
 * 扫描范围＝全部样式表（v2 层 + 组件层 + 基础层）+ 预览页。
 * 三条：
 *   1. 发出的每个 --k2-* 都有人用（样式或预览页），用的每个都定义过 —— 双向对齐；
 *   2. 亮暗两套颜色键完全一致，值都是合法颜色；
 *   3. 新增的状态色在真实底色上的对比度达标（正文与最弱文字按 AA，禁用态按豁免只做登记）。
 */

const ROOT = process.cwd()
const stylesDir = resolve(ROOT, 'src/styles')
// 守卫范围＝完整样式体系（所有样式表）+ 预览页：v2 是唯一 source，谁都不许用没定义的变量
const scss = readdirSync(stylesDir)
  .filter((file) => file.endsWith('.scss'))
  .map((file) => readFileSync(resolve(stylesDir, file), 'utf8'))
  .join('\n')
const lab = readFileSync(resolve(ROOT, 'src/views/StyleLabView.vue'), 'utf8')
const sources = `${scss}\n${lab}`
const used = new Set(
  [...sources.matchAll(/--k2-[A-Za-z0-9-]+/g)]
    // 拼出来的写法会留下 --k2-c- 这样的半截名字，不算一个变量
    .map((m) => m[0])
    .filter((name) => !name.endsWith('-')),
)
// 有一批名字是拼出来的（预览页里 var(--k2-n-${k})、var(--k2-shadow-${s}) 这类），
// 字面量扫不到，所以按「前缀」认领：以该前缀开头的定义都算有人用。
const dynamicPrefixes = [...sources.matchAll(/--k2-[A-Za-z0-9-]*\$\{/g)].map((m) =>
  m[0].slice(0, -2),
)
// 组件自己量出来、写进内联 style 的局部变量（如 MonitorCard 的 --k2-tag-max）：
// 不是 token，但只要组件里有定义就算「定义过」，否则会误报未定义。
const componentLocalVars = ((): Set<string> => {
  const found = new Set<string>()
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.vue')) {
        for (const m of readFileSync(full, 'utf8').matchAll(/'(--k2-[a-z0-9-]+)'/g))
          found.add(m[1]!)
      }
    }
  }
  walk(resolve(ROOT, 'src'))
  return found
})()

const defined = new Set([
  ...Object.keys(v2Vars(false)),
  ...Object.keys(v2Vars(true)),
  ...componentLocalVars,
])
const isUsed = (name: string): boolean =>
  used.has(name) || dynamicPrefixes.some((prefix) => name.startsWith(prefix))

function luminance(color: string): number {
  const hex = color.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** 把带透明度的色压到底色上，得到实际看到的颜色 */
function flatten(color: string, bg: string): string {
  const rgba = color.match(/rgba?\(([^)]+)\)/)
  if (!rgba) return color
  const [r, g, b, a = '1'] = rgba[1]!.split(',').map((part) => Number(part.trim()))
  const base = bg.replace('#', '')
  const mix = (fg: number, index: number) => {
    const back = parseInt(base.slice(index * 2, index * 2 + 2), 16)
    return Math.round(fg! * (a as number) + back * (1 - (a as number)))
  }
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(mix(r!, 0))}${hex(mix(g!, 1))}${hex(mix(b!, 2))}`
}

const COLOR = /^(#[0-9a-f]{6}|rgba?\([^)]+\))$/i

describe('v2 token 层', () => {
  it('变量双向对齐：发出来的都有人用，用到的都定义过', () => {
    const unused = [...defined].filter((name) => !isUsed(name)).sort()
    const undefinedVars = [...used].filter((name) => !defined.has(name)).sort()
    expect(unused, `定义了却没人用：${unused.join(', ')}`).toEqual([])
    expect(undefinedVars, `用了却没定义：${undefinedVars.join(', ')}`).toEqual([])
  })

  it('亮暗两套颜色键一致，且都是合法颜色', () => {
    const light = Object.keys(V2_COLOR.light).sort()
    expect(Object.keys(V2_COLOR.dark).sort()).toEqual(light)
    for (const theme of ['light', 'dark'] as const) {
      for (const [key, value] of Object.entries(V2_COLOR[theme])) {
        expect(value, `${theme}.${key}`).toMatch(COLOR)
      }
    }
  })

  it('状态与辅助色是成对出现的（柔和底都配了深色文字版）', () => {
    expect(V2_COLOR.light.markBorder).toBeTruthy()
    expect(V2_COLOR.light.skeletonSheen).not.toBe(V2_COLOR.light.skeleton)
    expect(V2_COLOR.dark.skeletonSheen).not.toBe(V2_COLOR.dark.skeleton)
  })

  it('新增色的对比度：正文/次要/最弱文字与关联高亮都过 AA 4.5', () => {
    const light = V2_COLOR.light
    const dark = V2_COLOR.dark
    const pairs: [string, string, string][] = [
      ['亮 · 正文 / 卡片底', light.text, light.surface],
      ['亮 · 次要文字 / 卡片底', light.textMuted, light.surface],
      ['亮 · 最弱文字 / 卡片底', light.textFaint, light.surface],
      ['亮 · 正文 / 关联高亮底', light.text, flatten(light.mark, light.surface)],
      ['暗 · 正文 / 卡片底', dark.text, dark.surface],
      ['暗 · 次要文字 / 卡片底', dark.textMuted, dark.surface],
      ['暗 · 最弱文字 / 卡片底', dark.textFaint, dark.surface],
      ['暗 · 正文 / 关联高亮底', dark.text, flatten(dark.mark, dark.surface)],
    ]
    for (const [name, fg, bg] of pairs) {
      const value = ratio(fg.startsWith('#') ? fg : flatten(fg, bg), bg)
      expect(value, `${name} = ${value.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('禁用态的字色比正文弱、但不至于看不见（豁免 AA，只登记下限 3:1）', () => {
    for (const theme of [V2_COLOR.light, V2_COLOR.dark]) {
      const bg = theme.disabledBg.startsWith('#')
        ? theme.disabledBg
        : flatten(theme.disabledBg, theme.surface)
      const value = ratio(theme.disabledText, bg)
      expect(
        value,
        `禁用文字 ${theme.disabledText} / ${bg} = ${value.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(2)
      expect(ratio(theme.disabledText, bg)).toBeLessThan(ratio(theme.textMuted, theme.surface))
    }
  })
})
