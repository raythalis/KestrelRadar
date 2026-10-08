/**
 * 采集计划（cron）的形状识别。
 *
 * 只认常见形状，认不出来返回 `null` —— 调用方显示「自定义时间」，并把原表达式放进 tooltip。
 * 纯字符串解析、不引依赖：这份代码要能同时在前端（展示）和后端（推送文案）跑，
 * 所以不能用 croner 那种只装在服务端的库。
 *
 * **这里只解析形状，不写文案**：返回 `{ key, params }`，文案由调用方按语言翻
 * （前端走语言包里的 cron.* 组）。同一个形状只有一份解析、两种语言各一份文案，
 * 改一处不会漏另一处。
 *
 * 认得的形状（5 段：分 时 日 月 周，月份必须是通配）：
 *
 * - 每分钟；每 N 分钟（步长写法）
 * - 每小时；每小时的第 N 分；每 N 小时（整点 / 第 N 分各一种说法）
 * - 每天 HH:MM
 * - 每工作日 HH:MM
 * - 每周一到周日（单个或多天列表）HH:MM
 * - 每月 N 日 HH:MM
 *
 * 认不出的（返回 null）：6 段带秒、带月份、日期写多天列表、星期写 `1#2` 这类。
 */

/** 认识出来的形状：key 对应语言包里的 cron.<key>；params 是插值参数 */
export interface CronShape {
  key:
    | 'everyMinute'
    | 'everyNMinutes'
    | 'hourly'
    | 'hourlyAt'
    | 'everyNHours'
    | 'everyNHoursAt'
    | 'dailyAt'
    | 'weekdaysAt'
    | 'weeklyAt'
    | 'monthlyAt'
  /**
   * 插值参数：n / minute / time / day 是标量；
   * days 是 0（周日）到 6（周六）的数组，由调用方拼成当前语言的星期名与分隔符。
   */
  params: Record<string, string | number | number[]>
}

function isPlainNumber(value: string): boolean {
  return /^\d{1,2}$/.test(value)
}

function isStep(value: string): boolean {
  return /^\*\/\d{1,2}$/.test(value)
}

function toNumber(value: string): number {
  return Number(value)
}

function two(value: number): string {
  return String(value).padStart(2, '0')
}

export function humanizeCron(expression: string): CronShape | null {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [
    string,
    string,
    string,
    string,
    string,
  ]
  if (month !== '*') return null

  const everyDay = dayOfMonth === '*' && dayOfWeek === '*'

  if (!isPlainNumber(minute)) {
    if (minute === '*' && hour === '*' && everyDay) return { key: 'everyMinute', params: {} }
    if (isStep(minute) && hour === '*' && everyDay) {
      return { key: 'everyNMinutes', params: { n: toNumber(minute.slice(2)) } }
    }
    return null
  }

  const mm = two(toNumber(minute))

  if (isStep(hour)) {
    if (!everyDay) return null
    const step = toNumber(hour.slice(2))
    return toNumber(minute) === 0
      ? { key: 'everyNHours', params: { n: step } }
      : { key: 'everyNHoursAt', params: { n: step, minute: mm } }
  }

  if (hour === '*' && everyDay) {
    return toNumber(minute) === 0
      ? { key: 'hourly', params: {} }
      : { key: 'hourlyAt', params: { minute: mm } }
  }

  if (!isPlainNumber(hour)) return null
  const clock = `${two(toNumber(hour))}:${mm}`

  if (everyDay) return { key: 'dailyAt', params: { time: clock } }

  if (dayOfMonth === '*' && dayOfWeek !== '*') {
    if (dayOfWeek === '1-5') return { key: 'weekdaysAt', params: { time: clock } }
    const days = dayOfWeek.split(',').map(Number)
    if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return null
    }
    return { key: 'weeklyAt', params: { time: clock, days } }
  }

  if (dayOfWeek === '*' && isPlainNumber(dayOfMonth)) {
    return { key: 'monthlyAt', params: { day: toNumber(dayOfMonth), time: clock } }
  }

  return null
}
