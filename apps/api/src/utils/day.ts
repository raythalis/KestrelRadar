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

export interface DayWindow {
  /** 包含 */
  start: string
  /** 不包含 */
  end: string
}

/** 最近 N 天拆成 [start, end) 窗口：最早的一天在前，最后一个窗口到「明天 00:00」 */
export function dayWindows(timezone: string, days: number, now: Date = new Date()): DayWindow[] {
  const starts = Array.from({ length: days + 1 }, (_, index) =>
    startOfDayIso(timezone, days - 1 - index, now),
  )
  const windows: DayWindow[] = []
  for (let index = 0; index < days; index += 1) {
    const start = starts[index]
    const end = starts[index + 1]
    if (start === undefined || end === undefined) break
    windows.push({ start, end })
  }
  return windows
}

/**
 * 每天一列的聚合片段（sum），列名 d0、d1……最早的一天在前。
 * 参数按窗口顺序两个一组（start、end）；调用方把这些参数排在 where 参数之前。
 */
export function dailySumColumns(
  valueExpr: string,
  windows: DayWindow[],
): { sql: string; params: string[] } {
  const sql: string[] = []
  const params: string[] = []
  windows.forEach((window, index) => {
    sql.push(
      `coalesce(sum(case when created_at >= ? and created_at < ? then ${valueExpr} else 0 end), 0) as d${index}`,
    )
    params.push(window.start, window.end)
  })
  return { sql: sql.join(', '), params }
}
