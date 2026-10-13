/** 时间显示：界面上统一「设置里的时区 + 年月日时分」，没有值就显示占位符 */
export function templateDisplayName(
  template: { name: string; nameKey: string | null },
  translate: (key: string) => string,
): string {
  return template.nameKey ? translate(template.nameKey) : template.name
}

/**
 * 界面时间的显示时区：跟设置里的「时区」走；'system' / 未设置 / 写坏的名字都按浏览器时区。
 * 设置随配置一起加载与保存，由 stores/config 写入；后端定时任务用同一个时区，两边口径一致。
 */
let displayTimezone: string | undefined

function resolveTimezone(timezone: string | null | undefined): string | undefined {
  if (!timezone || timezone === 'system') return undefined
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return timezone
  } catch {
    return undefined
  }
}

export function setDisplayTimezone(timezone: string | null | undefined): void {
  displayTimezone = resolveTimezone(timezone)
}

export function getDisplayTimezone(): string | undefined {
  return displayTimezone
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(displayTimezone ? { timeZone: displayTimezone } : {}),
  }).format(date)
}

/** 紧凑时间：卡片这类窄位置用「月-日 时:分」，按设置里的时区；没有值返回空串（让调用方决定要不要占位） */
export function formatShortDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  if (displayTimezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: displayTimezone,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const at = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
    return `${at('month')}-${at('day')} ${at('hour')}:${at('minute')}`
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 当前小时（0–23）：按设置里的时区算，供「早上好 / 晚上好」这类按时段的文案用 */
export function currentHour(now: Date = new Date()): number {
  if (displayTimezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: displayTimezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value)
    if (!Number.isNaN(hour)) return hour
  }
  return now.getHours()
}

/**
 * 相对时间的「事实部分」：多久之前。
 * 只给单位与数值，具体的字（分钟前 / minutes ago）交给页面按语言拼；超过一天返回 null，
 * 由调用方改用日期格式——「27 小时前」不如直接写时间。
 */
export interface TimeAgo {
  unit: 'now' | 'minute' | 'hour'
  value: number
}

export function timeAgo(value: string | null | undefined, now: Date = new Date()): TimeAgo | null {
  if (!value) return null
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return null
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000)
  if (minutes < 1) return { unit: 'now', value: 0 }
  if (minutes < 60) return { unit: 'minute', value: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { unit: 'hour', value: hours }
  return null
}
