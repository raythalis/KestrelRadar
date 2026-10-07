/**
 * 异常原因的 i18n 覆盖护栏（2026-10-07 定版）。
 *
 * 规矩：
 * - 异常原因和别的用户可见文本一样，走「码 → i18n key → 当前语言」，不再直接展示库里存的中文原文；
 * - 码表以后端契约为准（FAILURE_CODES），前端只维护 code → i18n key 这一层映射，不另立第二套码；
 * - 原文（incident.message）只作兜底：认不出的码、老数据、暂时没翻译；
 * - 少一个码、或英文包里出现中文，这里就红。
 */
import { FAILURE_CODES } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'
import { incidentDetail, incidentReasonKey } from '@/utils/incident'

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

function flatten(node: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else if (value && typeof value === 'object') {
      Object.assign(out, flatten(value as Record<string, unknown>, path))
    }
  }
  return out
}

const zh = flatten(zhCN as unknown as Record<string, unknown>)
const enText = flatten(en as unknown as Record<string, unknown>)

describe('异常原因的 i18n 覆盖', () => {
  it('每个 failure code 在中英两套里都有 incident 文案', () => {
    const missing = FAILURE_CODES.flatMap((code) => {
      const gaps: string[] = []
      if (!zh[`incident.${code}`]) gaps.push(`zh-CN:${code}`)
      if (!enText[`incident.${code}`]) gaps.push(`en:${code}`)
      return gaps
    })
    expect(missing).toEqual([])
  })

  it('同一个码的文案不为空，且英文里不出现中文', () => {
    const empty = FAILURE_CODES.filter(
      (code) => !zh[`incident.${code}`]?.trim() || !enText[`incident.${code}`]?.trim(),
    )
    expect(empty).toEqual([])
    const chinese = FAILURE_CODES.filter((code) => CJK.test(enText[`incident.${code}`] ?? ''))
    expect(chinese).toEqual([])
  })

  it('这 5 个码的副信息原样展示（语言无关，中英两种语言下都一样）', () => {
    expect(incidentDetail({ code: 'fetch.timeout', detail: '30s' })).toBe('30s')
    expect(incidentDetail({ code: 'fetch.http401or403', detail: 'HTTP 401' })).toBe('HTTP 401')
    expect(incidentDetail({ code: 'fetch.httpStatus', detail: 'HTTP 503' })).toBe('HTTP 503')
    expect(incidentDetail({ code: 'delivery.webhookStatus', detail: 'HTTP 500' })).toBe('HTTP 500')
    expect(incidentDetail({ code: 'delivery.telegramAuth', detail: 'Unauthorized' })).toBe(
      'Unauthorized',
    )
  })

  it('别的码不给副信息（那边的 detail 是给人看的排查原文，不一定语言无关）', () => {
    expect(incidentDetail({ code: 'llm.failed', detail: '模型调用失败' })).toBe('')
    expect(incidentDetail({ code: 'web.noFeedLink', detail: 'HTTP 200' })).toBe('')
  })

  it('没有值、或值里带中文（历史数据）时空着，卡片不占位', () => {
    expect(incidentDetail({ code: 'fetch.timeout', detail: null })).toBe('')
    expect(incidentDetail({ code: 'fetch.httpStatus', detail: '对方服务器返回 503' })).toBe('')
    expect(incidentDetail({ code: 'fetch.timeout', detail: '   ' })).toBe('')
  })

  it('码 → key 只认契约里的码，认不出来返回 null（交给原文兜底）', () => {
    expect(incidentReasonKey('fetch.timeout')).toBe('incident.fetch.timeout')
    expect(incidentReasonKey('delivery.telegramAuth')).toBe('incident.delivery.telegramAuth')
    expect(incidentReasonKey('fetch.notARealCode')).toBeNull()
    expect(incidentReasonKey('')).toBeNull()
  })
})
