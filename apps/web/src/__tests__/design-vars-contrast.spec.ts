import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { THEMES, colorVars } from '@/design/tokens/color'
import { foundationVars } from '@/design/tokens/foundation'

const src = resolve(process.cwd(), 'src')
const stylesDir = resolve(src, 'styles')

function allScss(): string {
  return readdirSync(stylesDir)
    .filter((f) => f.endsWith('.scss'))
    .map((f) => readFileSync(resolve(stylesDir, f), 'utf8'))
    .join('\n')
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe('样式的变量与对比度', () => {
  it('样式里引用的每个 --k-* 变量都在 tokens 里定义过（防拼错）', () => {
    // 变量名有一部分是拼出来的（--k-space-1 这类），所以问真正的生成函数，不猜源码字面量
    const defined = new Set([
      ...Object.keys(foundationVars(false)),
      ...Object.keys(foundationVars(true)),
      ...Object.keys(colorVars(THEMES[0].tokens)),
      ...Object.keys(colorVars(THEMES[1].tokens)),
    ])
    const used = new Set(
      allScss()
        .match(/var\((--k-[a-z0-9-]+)\)/g)
        ?.map((v) => v.slice(4, -1)) ?? [],
    )
    const missing = [...used].filter((name) => !defined.has(name))
    expect(missing).toEqual([])
  })

  it('正文三档灰对两种主题的底色都达到 4.5:1', () => {
    for (const theme of THEMES) {
      const { text, muted, faint, panel, panel2, bg } = theme.tokens
      for (const [bgName, bgColor] of [
        ['panel', panel],
        ['panel2', panel2],
        ['bg', bg],
      ] as const) {
        for (const [name, color] of [
          ['text', text],
          ['muted', muted],
          ['faint', faint],
        ] as const) {
          expect(
            ratio(color, bgColor),
            `${theme.id}: ${name} 在 ${bgName} 上对比度不足`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})
