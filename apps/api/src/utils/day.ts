/**
 * 按设置里的时区算「今天从哪一刻开始」。
 * timezone 为 'system' 或非法值时就按服务器本地时区算。
 */
function offsetMs(timeZone: string, date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date)
    const at: Record<string, string> = {}
    for (const part of parts) at[part.type] = part.value
    const asUtc = Date.UTC(
      Number(at.year),
      Number(at.month) - 1,
      Number(at.day),
      Number(at.hour) % 24,
      Number(at.minute),
      Number(at.second),
    )
    return asUtc - date.getTime()
  } catch {
    return null
  }
}

/** 该时区「今天 00:00」（daysAgo=1 就是昨天 00:00）对应的时刻，ISO 字符串 */
export function startOfDayIso(timezone: string, daysAgo = 0, now: Date = new Date()): string {
  const offset = timezone && timezone !== 'system' ? offsetMs(timezone, now) : null
  if (offset === null) {
    const local = new Date(now)
    local.setHours(0, 0, 0, 0)
    local.setDate(local.getDate() - daysAgo)
    return local.toISOString()
  }
  const shifted = new Date(now.getTime() + offset)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - daysAgo * 24 * 60 * 60 * 1000 - offset).toISOString()
}
