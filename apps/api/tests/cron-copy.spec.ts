import { humanizeCron } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

/**
 * 采集计划的形状：认得的形状逐条钉住，认不出来必须老实返回 null
 * （调用方显示「自定义时间」，原表达式进 tooltip —— 猜错比不猜更糟）。
 * 这里只钉形状与参数，文案在语言包里（前端 cron.* 组），所以断言里不出现中文。
 */
describe('humanizeCron', () => {
  it('分钟级', () => {
    expect(humanizeCron('* * * * *')).toEqual({ key: 'everyMinute', params: {} })
    expect(humanizeCron('*/30 * * * *')).toEqual({ key: 'everyNMinutes', params: { n: 30 } })
    expect(humanizeCron('*/5 * * * *')).toEqual({ key: 'everyNMinutes', params: { n: 5 } })
  })

  it('小时级', () => {
    expect(humanizeCron('0 * * * *')).toEqual({ key: 'hourly', params: {} })
    expect(humanizeCron('5 * * * *')).toEqual({ key: 'hourlyAt', params: { minute: '05' } })
    expect(humanizeCron('0 */2 * * *')).toEqual({ key: 'everyNHours', params: { n: 2 } })
    expect(humanizeCron('30 */6 * * *')).toEqual({
      key: 'everyNHoursAt',
      params: { n: 6, minute: '30' },
    })
  })

  it('每天 / 工作日 / 每周 / 每月', () => {
    expect(humanizeCron('30 8 * * *')).toEqual({ key: 'dailyAt', params: { time: '08:30' } })
    expect(humanizeCron('0 9 * * 1-5')).toEqual({ key: 'weekdaysAt', params: { time: '09:00' } })
    expect(humanizeCron('0 9 * * 1')).toEqual({
      key: 'weeklyAt',
      params: { time: '09:00', days: [1] },
    })
    expect(humanizeCron('0 9 * * 0')).toEqual({
      key: 'weeklyAt',
      params: { time: '09:00', days: [0] },
    })
    expect(humanizeCron('0 9 * * 1,3')).toEqual({
      key: 'weeklyAt',
      params: { time: '09:00', days: [1, 3] },
    })
    expect(humanizeCron('0 9 15 * *')).toEqual({
      key: 'monthlyAt',
      params: { day: 15, time: '09:00' },
    })
  })

  it('认不出的返回 null，不硬猜', () => {
    // 日期是多天列表
    expect(humanizeCron('0 9 1,15 * *')).toBeNull()
    // 带月份
    expect(humanizeCron('0 9 * 3 *')).toBeNull()
    // 6 段（带秒）
    expect(humanizeCron('0 0 9 * * *')).toBeNull()
    // 星期用了带序号的写法
    expect(humanizeCron('0 9 * * 1#2')).toBeNull()
    // 空串 / 段数不对
    expect(humanizeCron('')).toBeNull()
    expect(humanizeCron('0 9')).toBeNull()
  })
})
