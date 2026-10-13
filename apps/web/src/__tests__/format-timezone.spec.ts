import { afterEach, describe, expect, it } from 'vitest'

import {
  currentHour,
  formatDateTime,
  formatShortDateTime,
  getDisplayTimezone,
  setDisplayTimezone,
} from '@/utils/format'

/** 浏览器时区下的紧凑时间：拿它跟「回落」那几条对拍 */
function localShort(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

afterEach(() => {
  setDisplayTimezone(undefined)
})

describe('界面时间按设置里的时区显示', () => {
  it('指定时区：卡片上的 19:00 就是当地的 19:00', () => {
    setDisplayTimezone('Asia/Shanghai')

    expect(getDisplayTimezone()).toBe('Asia/Shanghai')
    // 11:00Z = 北京 19:00；19:00Z = 北京次日 03:00（就是那个「下次采集显示成凌晨」的现象）
    expect(formatShortDateTime('2026-10-13T11:00:00.000Z')).toBe('10-13 19:00')
    expect(formatShortDateTime('2026-10-13T19:00:00.000Z')).toBe('10-14 03:00')

    // 长格式同样按这个时区渲染（具体排字随浏览器语言，这里对拍同一份参考值）
    const iso = '2026-10-13T11:00:00.000Z'
    const reference = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai',
    }).format(new Date(iso))
    expect(formatDateTime(iso)).toBe(reference)
    expect(formatDateTime(iso)).not.toBe(formatDateTime('2026-10-12T11:00:00.000Z'))
  })

  it('换成 UTC 就按 UTC 显示：同一个时刻差 8 小时', () => {
    setDisplayTimezone('UTC')

    expect(formatShortDateTime('2026-10-13T11:00:00.000Z')).toBe('10-13 11:00')
  })

  it('system、未设置、名字写坏：都回落到浏览器时区', () => {
    const iso = '2026-10-13T11:00:00.000Z'

    setDisplayTimezone('Asia/Shanghai')
    setDisplayTimezone('system')
    expect(getDisplayTimezone()).toBeUndefined()
    expect(formatShortDateTime(iso)).toBe(localShort(iso))

    setDisplayTimezone('Not/AZone')
    expect(getDisplayTimezone()).toBeUndefined()
    expect(formatShortDateTime(iso)).toBe(localShort(iso))
  })

  it('空值与非法时间仍是占位符 / 空串', () => {
    setDisplayTimezone('Asia/Shanghai')

    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('不是时间')).toBe('—')
    expect(formatShortDateTime(null)).toBe('')
    expect(formatShortDateTime('不是时间')).toBe('')
  })

  it('按时段换的问候语也按设置里的时区', () => {
    const at = new Date('2026-10-13T03:00:00.000Z')

    setDisplayTimezone('Asia/Shanghai')
    expect(currentHour(at)).toBe(11)

    setDisplayTimezone('UTC')
    expect(currentHour(at)).toBe(3)

    setDisplayTimezone('system')
    expect(currentHour(at)).toBe(at.getHours())
  })
})
