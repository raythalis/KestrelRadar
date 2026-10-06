/**
 * 采集计划（cron）的人话。
 *
 * 只认常见形状，认不出来返回 `null` —— 调用方显示「自定义时间」，并把原表达式放进 tooltip。
 * 纯字符串解析、不引依赖：这份代码要能同时在前端（展示）和后端（推送文案）跑，
 * 所以不能用 croner 那种只装在服务端的库。
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
 * 认不出的（原样交给调用方显示）：6 段带秒、带月份、日期写多天列表、星期写 `1#2` 这类。
 */
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

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

export function humanizeCron(expression: string): string | null {
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
    if (minute === '*' && hour === '*' && everyDay) return '每分钟'
    if (isStep(minute) && hour === '*' && everyDay) return `每 ${toNumber(minute.slice(2))} 分钟`
    return null
  }

  const mm = two(toNumber(minute))

  if (isStep(hour)) {
    if (!everyDay) return null
    const step = toNumber(hour.slice(2))
    return toNumber(minute) === 0 ? `每 ${step} 小时` : `每 ${step} 小时的第 ${mm} 分`
  }

  if (hour === '*' && everyDay) {
    return toNumber(minute) === 0 ? '每小时' : `每小时的第 ${mm} 分`
  }

  if (!isPlainNumber(hour)) return null
  const clock = `${two(toNumber(hour))}:${mm}`

  if (everyDay) return `每天 ${clock}`

  if (dayOfMonth === '*' && dayOfWeek !== '*') {
    if (dayOfWeek === '1-5') return `每工作日 ${clock}`
    const days = dayOfWeek.split(',').map(Number)
    if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return null
    }
    if (days.length === 1) return `每${WEEKDAYS[days[0]!]!} ${clock}`
    return `每周${days.map((day) => WEEKDAYS[day]!.slice(1)).join('、')} ${clock}`
  }

  if (dayOfWeek === '*' && isPlainNumber(dayOfMonth)) {
    return `每月 ${toNumber(dayOfMonth)} 日 ${clock}`
  }

  return null
}

/** 认不出人话时，卡片上显示的占位文案（原表达式进 tooltip） */
export const CUSTOM_SCHEDULE_COPY = '自定义时间'
