import {
  CHANNEL_ICONS,
  DISCOVERY_ICONS,
  MONITOR_ICONS,
  SEMANTIC_ICONS,
} from '@/components/biz/icons'
import { describe, expect, it } from 'vitest'

/**
 * 图标语义表守卫：**一个字形只表示一个意思**。
 *
 * 同一个语义可以在多处复用同一个字形（对），但两个不同语义共用字形就是撞车（错）——
 * 之前撞过：信号图标同时表示「RSS 来源类型」和「发现」，纸飞机同时表示
 * Telegram 渠道、动作、今日已投递。这条用例就是拦住这种复发。
 */
describe('图标语义表', () => {
  it('同一个字形不允许挂在两个不同语义上', () => {
    const groups: Record<string, Record<string, string>> = {
      渠道类型: CHANNEL_ICONS,
      来源类型: DISCOVERY_ICONS,
      监听模式: MONITOR_ICONS,
      界面语义: SEMANTIC_ICONS,
    }

    const owner = new Map<string, string>()
    const clashes: string[] = []

    for (const [group, table] of Object.entries(groups)) {
      for (const [key, glyph] of Object.entries(table)) {
        const label = `${group}.${key}`
        const seen = owner.get(glyph)
        if (seen) clashes.push(`${glyph} 同时给了「${seen}」和「${label}」`)
        else owner.set(glyph, label)
      }
    }

    expect(clashes).toEqual([])
  })
})
