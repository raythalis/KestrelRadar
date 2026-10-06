import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { LEGACY_VARS, V2_COLOR, v2Vars } from '@/design/v2/tokens'

/**
 * 变量守卫（完整样式体系）：
 *   1. 样式里用到的每个 --k2-* 都必须是 v2Vars 发出来的（防拼错、防死变量）；
 *   2. 样式里用到的每个 --k-* 都必须在兼容别名表里有映射（禁止新增旧名字）；
 *   3. 全仓（样式 + 组件 + 脚本）不许出现别名表以外的 --k-* 名字；
 *   4. Vuetify 主题只从 v2 token 生成，不许出现第二份色板。
 * 另外守住「文字读得清」的底线：正文/次要/最弱文字与语义色文字版的对比度。
 */

const root = process.cwd()
const stylesDir = resolve(root, 'src/styles')

function allScss(): string {
  return readdirSync(stylesDir)
    .filter((file) => file.endsWith('.scss'))
    .map((file) => readFileSync(resolve(stylesDir, file), 'utf8'))
    .join('\n')
}

/** 源码里出现的变量名（含 ${} 拼出来的半截名字，按前缀认领） */
/** 组件里量出来、由组件自己写进 style 的局部变量（如 --k2-tag-max）：不算 token，但也必须有定义 */
function componentLocalVars(): Set<string> {
  const found = new Set<string>()
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.vue')) {
        for (const match of readFileSync(full, 'utf8').matchAll(/'(--k2-[a-z0-9-]+)'/g)) {
          found.add(match[1]!)
        }
      }
    }
  }
  walk(resolve(root, 'src'))
  return found
}

function collect(text: string, prefix: string): { literal: Set<string>; dynamic: string[] } {
  const literal = new Set<string>()
  for (const match of text.matchAll(new RegExp(`${prefix}[A-Za-z0-9-]+`, 'g'))) {
    if (!match[0].endsWith('-')) literal.add(match[0])
  }
  const dynamic = [...text.matchAll(new RegExp(`${prefix}[A-Za-z0-9-]*\\$\\{`, 'g'))].map((m) =>
    m[0].slice(0, -2),
  )
  return { literal, dynamic }
}

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
    return Math.round(fg * (a as number) + back * (1 - (a as number)))
  }
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(mix(r!, 0))}${hex(mix(g!, 1))}${hex(mix(b!, 2))}`
}

describe('样式变量守卫', () => {
  it('样式里用到的每个 --k2-* 都是 v2Vars 发出来的', () => {
    const defined = new Set([
      ...Object.keys(v2Vars(false)),
      ...Object.keys(v2Vars(true)),
      ...componentLocalVars(),
    ])
    const { literal, dynamic } = collect(allScss(), '--k2-')
    const missing = [...literal].filter(
      (name) => !defined.has(name) && !dynamic.some((prefix) => name.startsWith(prefix)),
    )
    expect(missing.sort(), `用了却没定义：${missing.join(', ')}`).toEqual([])
  })

  it('样式里用到的每个 --k-* 都在兼容别名表里（禁止新增旧名字）', () => {
    const { literal, dynamic } = collect(allScss(), '--k-')
    const unknown = [...literal].filter(
      (name) => !(name in LEGACY_VARS) && !dynamic.some((prefix) => name.startsWith(prefix)),
    )
    expect(unknown.sort(), `没有映射的旧变量：${unknown.join(', ')}`).toEqual([])
  })

  it('全仓（样式 + 组件 + 脚本）不出现别名表以外的 --k-* 名字', () => {
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue
          walk(full)
        } else if (/\.(scss|vue|ts)$/.test(entry.name)) {
          files.push(full)
        }
      }
    }
    walk(resolve(root, 'src'))
    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const name of collect(text, '--k-').literal) {
        // 别名表自己（唯一允许出现旧名字的地方）
        if (name in LEGACY_VARS) continue
        offenders.push(`${file.replace(`${root}/`, '')}: ${name}`)
      }
    }
    expect(offenders.sort()).toEqual([])
  })

  it('v1 token 模块已经不存在，Vuetify 只从 v2 token 取色', () => {
    expect(existsSync(resolve(root, 'src/design/tokens'))).toBe(false)
    const vuetify = readFileSync(resolve(root, 'src/plugins/vuetify.ts'), 'utf8')
    expect(vuetify).toContain("from '@/design/v2/tokens'")
    expect(vuetify).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(vuetify).not.toMatch(/rgba?\(/)
  })
})

describe('对比度（v2 正式色值）', () => {
  it('正文 / 次要文字在两种主题的三种底色上都过 AA 4.5', () => {
    for (const theme of ['light', 'dark'] as const) {
      const c = V2_COLOR[theme]
      for (const [bgName, bg] of [
        ['surface', c.surface],
        ['surface2', c.surface2],
        ['bg', c.bg],
      ] as const) {
        for (const [name, color] of [
          ['text', c.text],
          ['textMuted', c.textMuted],
        ] as const) {
          const value = ratio(color, bg)
          expect(
            value,
            `${theme}: ${name} 在 ${bgName} 上 = ${value.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('最弱文字：卡片底上过 AA，页面底上守住 4:1（非关键信息）', () => {
    for (const theme of ['light', 'dark'] as const) {
      const c = V2_COLOR[theme]
      expect(ratio(c.textFaint, c.surface)).toBeGreaterThanOrEqual(4.5)
      expect(ratio(c.textFaint, c.surface2)).toBeGreaterThanOrEqual(4)
      expect(ratio(c.textFaint, c.bg)).toBeGreaterThanOrEqual(4)
    }
  })

  it('语义色的「文字版」（Ink）压在各自柔和底上过 AA 4.5', () => {
    for (const theme of ['light', 'dark'] as const) {
      const c = V2_COLOR[theme]
      const pairs: [string, string, string][] = [
        ['primary', c.primaryInk, c.primarySoft],
        ['success', c.successInk, c.successSoft],
        ['warning', c.warningInk, c.warningSoft],
        ['danger', c.dangerInk, c.dangerSoft],
        ['info', c.infoInk, c.infoSoft],
      ]
      for (const [name, ink, soft] of pairs) {
        const bg = flatten(soft, c.surface)
        const value = ratio(ink, bg)
        expect(
          value,
          `${theme}: ${name}Ink 在 ${name}Soft 上 = ${value.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
      // 主要按钮：压在品牌色上的文字
      expect(ratio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
