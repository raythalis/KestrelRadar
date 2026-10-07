import { z } from 'zod'

/**
 * 严格 cron 语法校验：只放行「数字 / * / 区间 / 步长 / 逗号列表」这套写法，
 * 并且逐段检查取值范围（分钟 0-59、小时 0-23、日 1-31、月 1-12、周 0-7）。
 * 不认 @daily、MON 这类别名。前后端共用同一份，写入口都用它把关。
 * 段数收 5 段：界面选择器只产 5 段，调度器另外还认带秒的 6 段（那是运行期的事）。
 */
const FIELD_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
]

const NUMBER = /^\d{1,2}$/

function isValidField(field: string, min: number, max: number): boolean {
  for (const part of field.split(',')) {
    if (part === '') return false
    const pieces = part.split('/')
    if (pieces.length > 2) return false

    const body = pieces[0] ?? ''
    const stepText = pieces[1]
    if (stepText !== undefined) {
      if (!NUMBER.test(stepText)) return false
      const step = Number(stepText)
      if (step < 1 || step > max) return false
    }

    if (body === '*') continue

    if (body.includes('-')) {
      const bounds = body.split('-')
      if (bounds.length !== 2) return false
      const [fromText = '', toText = ''] = bounds
      if (!NUMBER.test(fromText) || !NUMBER.test(toText)) return false
      const from = Number(fromText)
      const to = Number(toText)
      if (from < min || to > max || from > to) return false
      continue
    }

    if (!NUMBER.test(body)) return false
    const value = Number(body)
    if (value < min || value > max) return false
  }
  return true
}

export function isValidCronExpression(expression: string): boolean {
  const fields = expression.trim().split(/\s+/).filter(Boolean)
  if (fields.length !== 5) return false
  return fields.every((field, index) => {
    const range = FIELD_RANGES[index]
    return range !== undefined && isValidField(field, range[0], range[1])
  })
}

export const CRON_MESSAGE = '定时表达式不合法，例如「0 * * * *」表示每小时整点看一次'

/** 必填的 cron（发现频率） */
export function cronExpressionSchema() {
  return z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine(isValidCronExpression, { message: CRON_MESSAGE, params: { rule: 'INVALID_CRON' } })
}

/** 可空的 cron（动作的汇总时间）：空串 / null 都当没填 */
export function optionalCronSchema() {
  return z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === '' || isValidCronExpression(value), {
      message: CRON_MESSAGE,
      params: { rule: 'INVALID_CRON' },
    })
    .nullable()
}
