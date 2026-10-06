import { CUSTOM_SCHEDULE_COPY, humanizeCron } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

/**
 * 采集计划的人话：认得的形状逐条钉住，认不出来必须老实返回 null
 * （调用方显示「自定义时间」，原表达式进 tooltip —— 猜错比不猜更糟）。
 */
describe('humanizeCron', () => {
  it('分钟级', () => {
    expect(humanizeCron('* * * * *')).toBe('每分钟')
    expect(humanizeCron('*/30 * * * *')).toBe('每 30 分钟')
    expect(humanizeCron('*/5 * * * *')).toBe('每 5 分钟')
  })

  it('小时级', () => {
    expect(humanizeCron('0 * * * *')).toBe('每小时')
    expect(humanizeCron('5 * * * *')).toBe('每小时的第 05 分')
    expect(humanizeCron('0 */2 * * *')).toBe('每 2 小时')
    expect(humanizeCron('30 */6 * * *')).toBe('每 6 小时的第 30 分')
  })

  it('每天 / 工作日 / 每周 / 每月', () => {
    expect(humanizeCron('30 8 * * *')).toBe('每天 08:30')
    expect(humanizeCron('0 9 * * 1-5')).toBe('每工作日 09:00')
    expect(humanizeCron('0 9 * * 1')).toBe('每周一 09:00')
    expect(humanizeCron('0 9 * * 0')).toBe('每周日 09:00')
    expect(humanizeCron('0 9 * * 1,3')).toBe('每周一、三 09:00')
    expect(humanizeCron('0 9 15 * *')).toBe('每月 15 日 09:00')
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

  it('占位文案跟函数一起导出（卡片和推送共用同一句话）', () => {
    expect(CUSTOM_SCHEDULE_COPY).toBe('自定义时间')
  })
})
