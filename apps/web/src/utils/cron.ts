// cron 表达式：校验 + 人话。
//
// 语法与形状识别在 @kestrel/contracts 里（前后端同一份），这里只做两件事：
// 1）把结果翻译成页面要的 reason；2）把认出来的形状翻成当前语言的文案。
// 文案在语言包的 cron.* 组里，组件不写死中文。
// 时间含义由 cron 选择器自己表达，字段旁边不再写人话翻译，只在写错时给一句报错。

import { humanizeCron, isValidCronExpression, type CronShape } from '@kestrel/contracts'

import i18n from '@/plugins/i18n'

export type CronProblem = 'fieldCount' | 'syntax'
export type CronCheck = { ok: true } | { ok: false; reason: CronProblem }

export function checkCron(expression: string): CronCheck {
  const fields = expression.trim().split(/\s+/).filter(Boolean)
  if (fields.length !== 5) return { ok: false, reason: 'fieldCount' }
  if (!isValidCronExpression(expression)) return { ok: false, reason: 'syntax' }
  return { ok: true }
}

/** 取当前语言的文案：语言包没就绪也不该把展示变成一次异常 */
function tr(key: string, params?: Record<string, unknown>): string {
  try {
    return params ? i18n.global.t(key, params) : i18n.global.t(key)
  } catch {
    return key
  }
}

/**
 * 计划的人话：形状认得就按形状翻，认不出（null）写「自定义时间」。
 * 一周多天时，星期名与分隔符都按当前语言拼：中文「一、三」，英文 "Mon, Wed"。
 */
export function cronText(shape: CronShape | null): string {
  if (!shape) return tr('cron.custom')
  if (shape.key === 'weeklyAt') {
    const days = Array.isArray(shape.params.days) ? (shape.params.days as number[]) : []
    const list = days.map((day) => tr(`cron.day${day}`)).join(tr('cron.daySep'))
    return tr('cron.weeklyAt', { list, time: String(shape.params.time ?? '') })
  }
  return tr(`cron.${shape.key}`, shape.params as Record<string, unknown>)
}

/** 采集计划那行文字：给表达式就出人话，认不出写「自定义时间」 */
export function cronPlanText(expression: string): string {
  return cronText(humanizeCron(expression))
}
