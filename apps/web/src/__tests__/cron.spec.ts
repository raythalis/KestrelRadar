import { describe, expect, it } from 'vitest'

import { summarizeCron } from '@/utils/cron'

describe('cron 表达式人话翻译', () => {
  it('段数不对就明确报错，不猜', () => {
    expect(summarizeCron('0 8 * *')).toEqual({ ok: false, reason: 'fieldCount' })
    expect(summarizeCron('')).toEqual({ ok: false, reason: 'fieldCount' })
  })

  it('每分钟 / 每小时', () => {
    expect(summarizeCron('* * * * *')).toEqual({ ok: true, kind: 'everyMinute' })
    expect(summarizeCron('30 * * * *')).toEqual({ ok: true, kind: 'hourly', minute: 30 })
  })

  it('每天某个时间 / 多个小时 / 时间区间', () => {
    expect(summarizeCron('0 8 * * *')).toEqual({ ok: true, kind: 'daily', minute: 0, hour: 8 })
    expect(summarizeCron('15 8,20 * * *')).toEqual({
      ok: true,
      kind: 'hours',
      minute: 15,
      hours: [8, 20],
    })
    expect(summarizeCron('0 9-11 * * *')).toEqual({
      ok: true,
      kind: 'hours',
      minute: 0,
      hours: [9, 10, 11],
    })
  })

  it('每周 / 每月', () => {
    expect(summarizeCron('0 8 * * 1')).toEqual({
      ok: true,
      kind: 'weekly',
      minute: 0,
      hour: 8,
      days: [1],
    })
    expect(summarizeCron('0 8 * * 1-5')).toEqual({
      ok: true,
      kind: 'weekly',
      minute: 0,
      hour: 8,
      days: [1, 2, 3, 4, 5],
    })
    expect(summarizeCron('0 8 1,15 * *')).toEqual({
      ok: true,
      kind: 'monthly',
      minute: 0,
      hour: 8,
      days: [1, 15],
    })
  })

  it('`*/N` 步长说清楚，不推给"不常见"', () => {
    expect(summarizeCron('*/10 * * * *')).toEqual({ ok: true, kind: 'everyMinutes', step: 10 })
    expect(summarizeCron('0 */6 * * *')).toEqual({
      ok: true,
      kind: 'everyHours',
      step: 6,
      minute: 0,
    })
    expect(summarizeCron('* */6 * * *')).toEqual({
      ok: true,
      kind: 'everyHours',
      step: 6,
      minute: null,
    })
  })

  it('形状不常见的表达式如实说"不常见"，不瞎翻译', () => {
    const s = summarizeCron('*/5 8 * * *')
    expect(s.ok && s.kind).toBe('other')
  })
})
