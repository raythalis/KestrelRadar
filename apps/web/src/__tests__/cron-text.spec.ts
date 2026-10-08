import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/plugins/i18n'
import { cronPlanText, cronText } from '@/utils/cron'

/** 语言是模块级的：这条用例改过就还原，别影响别的用例 */
afterEach(() => {
  i18n.global.locale.value = 'zh-CN'
})

describe('计划的人话：形状由契约给，文案走语言包', () => {
  it('中文：常见形状逐条钉住（切 i18n 之前的中文输出不许变）', () => {
    expect(cronPlanText('* * * * *')).toBe('每分钟')
    expect(cronPlanText('*/30 * * * *')).toBe('每 30 分钟')
    expect(cronPlanText('0 * * * *')).toBe('每小时')
    expect(cronPlanText('5 * * * *')).toBe('每小时的第 05 分')
    expect(cronPlanText('0 */2 * * *')).toBe('每 2 小时')
    expect(cronPlanText('30 */6 * * *')).toBe('每 6 小时的第 30 分')
    expect(cronPlanText('30 8 * * *')).toBe('每天 08:30')
    expect(cronPlanText('0 9 * * 1-5')).toBe('每工作日 09:00')
    expect(cronPlanText('0 9 * * 1')).toBe('每周一 09:00')
    expect(cronPlanText('0 9 * * 0')).toBe('每周日 09:00')
    expect(cronPlanText('0 9 * * 1,3')).toBe('每周一、三 09:00')
    expect(cronPlanText('0 9 15 * *')).toBe('每月 15 日 09:00')
  })

  it('英文：同一批形状不出现中文，星期名与分隔符按英文拼', () => {
    i18n.global.locale.value = 'en'
    expect(cronPlanText('* * * * *')).toBe('Every minute')
    expect(cronPlanText('*/30 * * * *')).toBe('Every 30 minutes')
    expect(cronPlanText('5 * * * *')).toBe('Every hour at :05')
    expect(cronPlanText('30 8 * * *')).toBe('Daily at 08:30')
    expect(cronPlanText('0 9 * * 1-5')).toBe('Weekdays at 09:00')
    expect(cronPlanText('0 9 * * 1')).toBe('Every Mon at 09:00')
    expect(cronPlanText('0 9 * * 0')).toBe('Every Sun at 09:00')
    expect(cronPlanText('0 9 * * 1,3')).toBe('Every Mon, Wed at 09:00')
    expect(cronPlanText('0 9 15 * *')).toBe('Monthly on day 15 at 09:00')
    for (const expression of [
      '* * * * *',
      '*/5 * * * *',
      '0 * * * *',
      '0 */2 * * *',
      '30 */6 * * *',
      '30 8 * * *',
      '0 9 * * 1-5',
      '0 9 * * 1,3',
      '0 9 15 * *',
    ]) {
      expect(cronPlanText(expression)).not.toMatch(/[\u3400-\u9fff]/)
    }
  })

  it('认不出来写「自定义时间」，不硬猜', () => {
    expect(cronText(null)).toBe('自定义时间')
    expect(cronPlanText('0 9 1,15 * *')).toBe('自定义时间')
    expect(cronPlanText('0 0 9 * * *')).toBe('自定义时间')
    i18n.global.locale.value = 'en'
    expect(cronText(null)).toBe('Custom schedule')
    expect(cronPlanText('0 9 1,15 * *')).toBe('Custom schedule')
  })
})
