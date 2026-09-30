import { describe, expect, it } from 'vitest'

import { isDue, nextRunAt } from '../src/modules/collection/scheduler.ts'

describe('定时判断', () => {
  it('按 cron 算下一次该跑的时间', () => {
    expect(nextRunAt('0 * * * *', new Date('2026-10-01T04:20:00.000Z'))?.toISOString()).toBe(
      '2026-10-01T05:00:00.000Z',
    )
    expect(nextRunAt('*/5 * * * *', new Date('2026-10-01T04:20:00.000Z'))?.toISOString()).toBe(
      '2026-10-01T04:25:00.000Z',
    )
  })

  it('从没抓过就要抓', () => {
    expect(
      isDue(
        { cronExpression: '0 * * * *', lastCheckedAt: null },
        new Date('2026-10-01T04:20:00.000Z'),
      ),
    ).toBe(true)
  })

  it('已经过了该跑的时间点才算到期，没到不动', () => {
    const now = new Date('2026-10-01T04:20:00.000Z')
    expect(
      isDue({ cronExpression: '0 * * * *', lastCheckedAt: '2026-10-01T03:05:00.000Z' }, now),
    ).toBe(true)
    expect(
      isDue({ cronExpression: '0 * * * *', lastCheckedAt: '2026-10-01T04:05:00.000Z' }, now),
    ).toBe(false)
  })

  it('不合法或停用的发现不参与', () => {
    const now = new Date('2026-10-01T04:20:00.000Z')
    expect(isDue({ cronExpression: '不是 cron', lastCheckedAt: null }, now)).toBe(false)
    expect(isDue({ cronExpression: '0 * * * *', lastCheckedAt: null, enabled: false }, now)).toBe(
      false,
    )
  })
})
