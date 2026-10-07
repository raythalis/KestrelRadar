/**
 * 异常原因：码 → i18n key。
 *
 * 规矩（2026-10-07 定版）：
 * - 用户可见文本一律走语言包，异常原因也不例外；库里存的 message 只是兜底；
 * - 码表以后端契约为准（FAILURE_CODES），这里只做「code → i18n key」这一层，
 *   不复制第二套业务码，也不改异常分类；
 * - 文案 key 的形状就是 `incident.<code>`（复现已有的 error.* / operation.* 那套）；
 * - 认不出的码返回 null，交给调用方退回记录里的原文。
 */
import { FAILURE_CODES } from '@kestrel/contracts'

const KNOWN: readonly string[] = FAILURE_CODES

/** 认得出的码给出 i18n key，认不出给 null */
export function incidentReasonKey(code: string): string | null {
  return KNOWN.includes(code) ? `incident.${code}` : null
}

/**
 * 这几个码的原文里带着排查要用的那个数或对方的原始说法，卡片上单独留一行副信息。
 * 只有这几个：别的码的 detail 是给人看的排查原文，不一定语言无关，不往界面上放。
 */
const DETAIL_CODES: ReadonlySet<string> = new Set<string>([
  'fetch.timeout',
  'fetch.http401or403',
  'fetch.httpStatus',
  'delivery.webhookStatus',
  'delivery.telegramAuth',
])

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const MAX_DETAIL = 120

/**
 * 副信息：语言无关的诊断片段（`30s` / `HTTP 503` / `Unauthorized`），两种语言下都直接展示。
 * 没有值、或值里带中文（历史数据）时给空串，卡片不占位。
 */
export function incidentDetail(incident: { code: string; detail: string | null }): string {
  if (!DETAIL_CODES.has(incident.code)) return ''
  const value = (incident.detail ?? '').replace(/\s+/g, ' ').trim()
  if (!value || CJK.test(value)) return ''
  return value.length > MAX_DETAIL ? `${value.slice(0, MAX_DETAIL)}…` : value
}
