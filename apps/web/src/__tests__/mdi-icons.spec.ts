import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { CHANNEL_TYPES } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

import { CHANNEL_ICONS } from '@/components/biz/icons'

/**
 * 图标名写错不会报错，只会渲染成空白（@mdi/font 7 删掉了一批品牌图标，
 * mdi-telegram 就是这么没的），所以拿字体文件逐个校一遍。
 */
const css = readFileSync(
  resolve(process.cwd(), 'node_modules/@mdi/font/css/materialdesignicons.css'),
  'utf8',
)

describe('图标名必须存在于 @mdi/font', () => {
  it('渠道图标：每个都查得到，并且覆盖了所有渠道类型', () => {
    expect(Object.keys(CHANNEL_ICONS).sort()).toEqual([...CHANNEL_TYPES].sort())

    for (const [type, icon] of Object.entries(CHANNEL_ICONS)) {
      expect(css, `${type} 用了字体里没有的 ${icon}`).toContain(`.${icon}::before`)
    }
  })
})
