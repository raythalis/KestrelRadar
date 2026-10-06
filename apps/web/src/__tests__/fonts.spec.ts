import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { V2_FONT_MONO, V2_FONT_SANS, V2_LEADING, V2_TYPE, V2_WEIGHT } from '@/design/v2/tokens'

/**
 * 自托管字体（见 src/assets/fonts/README.md）：
 *   Inter（普通界面）/ JetBrains Mono（代码、日志、IP、技术串）/ 裁剪版图标字体。
 * 中文不引 webfont，回落到系统中文 —— 字体栈里必须还留着中文回落项。
 * 本轮只换字体族：字号、行高、字重档位一个字都不许动，所以下面把它们钉死。
 */
const FONTS_DIR = resolve(process.cwd(), 'src/assets/fonts')
const styleFile = (name: string) =>
  // 剥掉注释再断言，免得注释里提到的 font-display 被算进来
  readFileSync(resolve(process.cwd(), 'src/styles', name), 'utf8').replace(/\/\/[^\n]*/g, ' ')

describe('自托管字体', () => {
  it('三个字体文件都在，并且不是空占位', () => {
    const sizes: Record<string, number> = {
      'inter-variable-latin.woff2': 40_000,
      'jetbrains-mono-variable-latin.woff2': 30_000,
      'materialdesignicons-subset.woff2': 3_000,
    }
    for (const [name, min] of Object.entries(sizes)) {
      const size = statSync(resolve(FONTS_DIR, name)).size
      expect(size, `${name} 只有 ${size} 字节，像是没生成成功`).toBeGreaterThan(min)
    }
  })

  it('字体族接在系统栈前面，中文仍留在回落链里', () => {
    expect(V2_FONT_SANS.startsWith("'Inter', ")).toBe(true)
    expect(V2_FONT_SANS).toContain("'PingFang SC'")
    expect(V2_FONT_SANS).toContain("'Microsoft YaHei'")
    expect(V2_FONT_MONO.startsWith("'JetBrains Mono', ")).toBe(true)
    // 中文不引 webfont：等宽栈尾部也必须接中文字体，否则中文落到宋体那类默认等宽
    expect(V2_FONT_MONO).toContain("'PingFang SC'")
  })

  it('@font-face：文本字体 swap + unicode-range 限 latin，图标字体 block', () => {
    const fonts = styleFile('fonts.scss')
    expect((fonts.match(/font-display: swap/g) ?? []).length).toBe(2)
    expect((fonts.match(/unicode-range:/g) ?? []).length).toBe(2)

    const mdi = styleFile('mdi.scss')
    expect(mdi).toContain('font-display: block')
    expect(mdi).not.toContain('font-display: swap')
  })

  it('字号 / 行高 / 字重档位是 v2 那一套（正式体系）', () => {
    expect(V2_TYPE).toEqual({
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
    })
    expect(V2_LEADING).toEqual({ tight: '1.25', snug: '1.4', normal: '1.6', relaxed: '1.75' })
    expect(V2_WEIGHT).toEqual({ regular: '400', medium: '500', semibold: '600', bold: '700' })
  })

  it('不再引全量 @mdi/font 的 CSS（改用裁剪版）', () => {
    const vuetify = readFileSync(resolve(process.cwd(), 'src/plugins/vuetify.ts'), 'utf8')
    expect(vuetify).not.toContain('@mdi/font/css')
    expect(readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8')).toContain(
      "import './styles/mdi.scss'",
    )
  })
})
