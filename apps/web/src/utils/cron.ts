// cron 表达式校验：只回答「这段能不能用」。
// 语法本身在 @kestrel/contracts 里（前后端同一份），这里只把结果翻译成页面要的 reason。
// 时间含义由 cron 选择器自己表达，字段旁边不再写人话翻译，只在写错时给一句报错。

import { isValidCronExpression } from '@kestrel/contracts'

export type CronProblem = 'fieldCount' | 'syntax'
export type CronCheck = { ok: true } | { ok: false; reason: CronProblem }

export function checkCron(expression: string): CronCheck {
  const fields = expression.trim().split(/\s+/).filter(Boolean)
  if (fields.length !== 5) return { ok: false, reason: 'fieldCount' }
  if (!isValidCronExpression(expression)) return { ok: false, reason: 'syntax' }
  return { ok: true }
}
