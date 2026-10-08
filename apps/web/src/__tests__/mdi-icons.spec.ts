import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { CHANNEL_TYPES } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

import { CHANNEL_ICONS } from '@/components/biz/icons'

/**
 * 图标字体是**裁剪版**：src/assets/fonts/materialdesignicons-subset.woff2（85 个图标）
 * + src/styles/mdi.scss 里的 `.mdi-<name>:before { content: … }` 规则。
 *
 * 名字对不上不会报错，只会渲染成空白（@mdi/font 7 删过一批品牌图标，mdi-telegram 就是这么没的），
 * 所以这里拿三类来源逐个对着裁剪清单校：
 *   1. 我们自己的渠道图标映射；
 *   2. 前端源码里出现的 mdi-*（注释里的写法先剥掉）；
 *   3. Vuetify 内置图标集 —— 选择框箭头、弹窗关闭、复选框、分页这些由 Vuetify 内部渲染，
 *      源码里搜不到名字，漏了同样会空白。
 * 加了新图标要重跑生成命令（见 src/assets/fonts/README.md）。
 */
const MDI_SCSS = readFileSync(resolve(process.cwd(), 'src/styles/mdi.scss'), 'utf8')
const declared = new Set(
  [...MDI_SCSS.matchAll(/\.mdi-([a-z0-9-]+):before/g)].map((match) => match[1] as string),
)

const FULL_MDI_CSS = readFileSync(
  resolve(process.cwd(), 'node_modules/@mdi/font/css/materialdesignicons.css'),
  'utf8',
)
const knownInFullFont = new Set(
  [...FULL_MDI_CSS.matchAll(/\.mdi-([a-z0-9-]+)::?before/g)].map((match) => match[1] as string),
)

const VUETIFY_MDI = readFileSync(
  resolve(process.cwd(), 'node_modules/vuetify/lib/iconsets/mdi.js'),
  'utf8',
)
const vuetifyIcons = new Set(
  [...VUETIFY_MDI.matchAll(/mdi-[a-z0-9-]+/g)].map((match) => match[0].replace('mdi-', '')),
)

const sources = import.meta.glob('/src/**/*.{vue,ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 剥掉注释，免得文档里的 mdi-xxx / mdi-telegram 被当成真的图标名 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
}

const usedInSource = new Set<string>()
for (const [file, text] of Object.entries(sources)) {
  if (file.includes('__tests__')) continue
  for (const match of stripComments(text).matchAll(/mdi-[a-z0-9-]+/g)) {
    usedInSource.add(match[0].replace('mdi-', ''))
  }
}

describe('裁剪版图标字体覆盖范围', () => {
  it('渠道图标：每个都查得到，并且覆盖了所有渠道类型', () => {
    expect(Object.keys(CHANNEL_ICONS).sort()).toEqual([...CHANNEL_TYPES].sort())

    for (const [type, icon] of Object.entries(CHANNEL_ICONS)) {
      expect(declared, `${type} 用了裁剪清单里没有的 ${icon}`).toContain(icon.replace('mdi-', ''))
    }
  })

  it('源码里出现的 mdi-* 都在裁剪清单里', () => {
    const missing = [...usedInSource].filter((name) => !declared.has(name)).sort()
    expect(
      missing,
      `这些图标不在 mdi.scss 里，加图标后要重跑生成命令：${missing.join(', ')}`,
    ).toEqual([])
  })

  it('Vuetify 内置图标集都在裁剪清单里', () => {
    const missing = [...vuetifyIcons].filter((name) => !declared.has(name)).sort()
    expect(missing, `Vuetify 内部会渲染这些图标，漏掉会空白：${missing.join(', ')}`).toEqual([])
  })

  it('裁剪清单里的名字都是真实存在的图标（对着 @mdi/font 全量清单校）', () => {
    const bogus = [...declared].filter((name) => !knownInFullFont.has(name)).sort()
    expect(bogus, `这些名字在 @mdi/font 里不存在，是拼错的：${bogus.join(', ')}`).toEqual([])
  })

  it('裁剪清单远小于全量清单', () => {
    expect(declared.size).toBeLessThan(120)
    expect(knownInFullFont.size).toBeGreaterThan(7000)
  })
})
