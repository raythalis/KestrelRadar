// cron 表达式校验：只回答「这段能不能用」。
// 时间含义由 cron 选择器自己表达，字段旁边不再写人话翻译，只在写错时给一句报错。

export type CronProblem = 'fieldCount' | 'syntax'
export type CronCheck = { ok: true } | { ok: false; reason: CronProblem }

/** 一段的合法写法：数字、区间、步长、*、以及它们的逗号列表 */
const SEGMENT = /(?:\*|\d{1,2})(?:-\d{1,2})?(?:\/\d{1,2})?/
const FIELD = new RegExp(`^${SEGMENT.source}(?:,${SEGMENT.source})*$`)

export function checkCron(expression: string): CronCheck {
  const fields = expression.trim().split(/\s+/).filter(Boolean)
  if (fields.length !== 5) return { ok: false, reason: 'fieldCount' }
  if (!fields.every((field) => FIELD.test(field))) return { ok: false, reason: 'syntax' }
  return { ok: true }
}
