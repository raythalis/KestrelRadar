// cron 表达式的读写与「人话」翻译。
// 只做纯函数，方便测试；文案交给组件用 i18n 拼，这里只返回结构。

export type CronSummary =
  | { ok: false; reason: 'fieldCount' | 'syntax' }
  | { ok: true; kind: 'everyMinute' }
  | { ok: true; kind: 'hourly'; minute: number }
  | { ok: true; kind: 'everyMinutes'; step: number }
  | { ok: true; kind: 'everyHours'; step: number; minute: number | null }
  | { ok: true; kind: 'hours'; minute: number; hours: number[] }
  | { ok: true; kind: 'daily'; minute: number; hour: number }
  | { ok: true; kind: 'weekly'; minute: number; hour: number; days: number[] }
  | { ok: true; kind: 'monthly'; minute: number; hour: number; days: number[] }
  | { ok: true; kind: 'other'; raw: string }

const isNum = (value: string): boolean => /^\d{1,2}$/.test(value)
/** 步长写法（星号斜杠 N）的步长值；不是这种形状就返回 null */
const stepValue = (value: string): number | null => {
  const matched = /^\*\/(\d{1,2})$/.exec(value)
  return matched ? Number(matched[1]) : null
}
const asNum = (value: string): number => Number(value)

function parseList(value: string): number[] | null {
  const parts = value.split(',')
  if (parts.length === 0) return null
  const out: number[] = []
  for (const part of parts) {
    if (!isNum(part)) return null
    out.push(asNum(part))
  }
  return out
}

function rangeList(value: string): number[] | null {
  const [from, to] = value.split('-')
  if (!from || !to || !isNum(from) || !isNum(to)) return null
  const start = asNum(from)
  const end = asNum(to)
  if (start > end) return null
  const out: number[] = []
  for (let hour = start; hour <= end && out.length <= 24; hour += 1) out.push(hour)
  return out.length ? out : null
}

/** 把表达式翻译成结构化描述；看不懂就明确说看不懂，不猜 */
export function summarizeCron(expression: string): CronSummary {
  const fields = expression.trim().split(/\s+/).filter(Boolean)
  if (fields.length !== 5) return { ok: false, reason: 'fieldCount' }
  const [minute, hour, dom, month, dow] = fields as [string, string, string, string, string]

  if (minute === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return { ok: true, kind: 'everyMinute' }
  }
  const plainShape = dom === '*' && month === '*' && dow === '*'

  // 步长写法（星号斜杠 N）是可视化生成器最常产出的形状，能说清就别推给不常见
  const minuteStep = stepValue(minute)
  const hourStep = stepValue(hour)
  if (plainShape && minuteStep && hour === '*') {
    return { ok: true, kind: 'everyMinutes', step: minuteStep }
  }
  if (plainShape && hourStep) {
    if (minute === '*') return { ok: true, kind: 'everyHours', step: hourStep, minute: null }
    if (isNum(minute)) {
      return { ok: true, kind: 'everyHours', step: hourStep, minute: Number(minute) }
    }
  }
  if (!isNum(minute) || minute.includes('/'))
    return { ok: true, kind: 'other', raw: expression.trim() }
  const minuteNum = asNum(minute)

  if (hour === '*')
    return plainShape
      ? { ok: true, kind: 'hourly', minute: minuteNum }
      : { ok: true, kind: 'other', raw: expression.trim() }

  const hours = hour.includes('-') ? rangeList(hour) : parseList(hour)
  if (!hours) return { ok: true, kind: 'other', raw: expression.trim() }
  if (hours.length > 1) {
    return plainShape
      ? { ok: true, kind: 'hours', minute: minuteNum, hours }
      : { ok: true, kind: 'other', raw: expression.trim() }
  }

  const only = hours[0]!
  if (plainShape) return { ok: true, kind: 'daily', minute: minuteNum, hour: only }
  if (dom === '*' && month === '*' && dow !== '*') {
    const days = dow === '1-5' ? [1, 2, 3, 4, 5] : parseList(dow)
    if (days) return { ok: true, kind: 'weekly', minute: minuteNum, hour: only, days }
  }
  if (month === '*' && dow === '*') {
    const days = parseList(dom)
    if (days) return { ok: true, kind: 'monthly', minute: minuteNum, hour: only, days }
  }
  return { ok: true, kind: 'other', raw: expression.trim() }
}
