import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/http'
import i18n from '@/plugins/i18n'
import { useToastStore } from '@/stores/toast'
import {
  apiErrorMessage,
  operationMessage,
  showApiError,
  showOperationResult,
} from '@/utils/feedback'

const API_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'INTERNAL_ERROR',
] as const

/** 业务码只有失败：成功由 ok=true 表达，没有 SUCCESS */
const OPERATION_CODES = [
  'AUTH_FAILED',
  'TIMEOUT',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'INVALID_RESPONSE',
  'UNAVAILABLE',
] as const

const RULES = [
  'REQUIRED_FIELD',
  'INVALID_FORMAT',
  'INVALID_URL',
  'INVALID_CRON',
  'OUT_OF_RANGE',
  'TOO_LONG',
  'TOO_MANY_ITEMS',
] as const

afterEach(() => {
  // 语言是模块级的：这条用例改过就还原，别影响别的用例
  i18n.global.locale.value = 'zh-CN'
})

describe('错误码 → 用户文案（文案由前端按码映射）', () => {
  it('每个 API 码都有自己的文案，界面上不出现英文码', () => {
    for (const code of API_CODES) {
      const text = apiErrorMessage(code)
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toContain(code)
      expect(text).not.toMatch(/[A-Z_]{6,}/)
    }
  })

  it('校验失败带字段规则时，用规则的具体话术；不带就用大类', () => {
    expect(apiErrorMessage('VALIDATION_ERROR', { field: 'name', rule: 'TOO_LONG' })).toBe(
      '内容长度超出上限',
    )
    expect(apiErrorMessage('VALIDATION_ERROR', { field: 'target', rule: 'INVALID_URL' })).toContain(
      'http://',
    )
    expect(apiErrorMessage('VALIDATION_ERROR')).toBe('提交内容不符合要求，请检查后重试')
  })

  it('每条字段级规则都有文案', () => {
    for (const rule of RULES) {
      const text = apiErrorMessage('VALIDATION_ERROR', { field: 'any', rule })
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toMatch(/[A-Z_]{6,}/)
    }
  })

  it('请求没到后端时给连接文案，而不是任何错误码', () => {
    expect(apiErrorMessage(null)).toContain('无法连接到后端服务')
  })

  it('认不出来的 API 码：先退回后端原文，没有原文才用通用文案', () => {
    expect(apiErrorMessage('SOMETHING_NEW' as never, undefined, 'boom')).toBe('boom')
    const fallback = apiErrorMessage('SOMETHING_NEW' as never)
    expect(fallback).not.toContain('SOMETHING_NEW')
    expect(fallback.length).toBeGreaterThan(0)
  })

  it('每个业务失败码都有自己的文案', () => {
    for (const code of OPERATION_CODES) {
      const text = operationMessage(code)
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toContain(code)
      expect(text).not.toMatch(/[A-Z_]{6,}/)
    }
  })

  it('业务码认不出来或没有码时退回后端原文，不把码铺到界面上', () => {
    expect(operationMessage('WHATEVER' as never, '对方说不行')).toBe('对方说不行')
    expect(operationMessage('WHATEVER' as never)).not.toContain('WHATEVER')
    expect(operationMessage(undefined, '对方说不行')).toBe('对方说不行')
  })

  it('文案出自语言包：切到英文，同一个码给英文文案', () => {
    i18n.global.locale.value = 'en'
    expect(apiErrorMessage('NOT_FOUND')).toBe('Record not found. Refresh and try again.')
    expect(apiErrorMessage('VALIDATION_ERROR', { field: 'n', rule: 'TOO_LONG' })).toBe('Too long')
    expect(operationMessage('AUTH_FAILED')).toContain('Authentication failed')
    expect(apiErrorMessage(null)).toContain('backend service')
  })

  it('两份语言都有这些 key：文案绝不留空、也不回落成 key 本身', () => {
    for (const locale of ['zh-CN', 'en'] as const) {
      i18n.global.locale.value = locale
      for (const code of API_CODES) {
        const text = apiErrorMessage(code)
        expect(text.length).toBeGreaterThan(0)
        expect(text).not.toContain('error.')
      }
      for (const code of OPERATION_CODES) {
        const text = operationMessage(code)
        expect(text.length).toBeGreaterThan(0)
        expect(text).not.toContain('operation.')
      }
    }
  })
})

describe('统一浮层出口', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('请求失败：一律红色，文案按码映射，不铺后端原文', () => {
    showApiError(new ApiError('NOT_FOUND', 'placeholder', undefined, 'Discovery not found'))
    const items = useToastStore().items
    expect(items).toHaveLength(1)
    expect(items[0]!.tone).toBe('danger')
    expect(items[0]!.text).toBe(apiErrorMessage('NOT_FOUND'))
    expect(items[0]!.text).not.toContain('Discovery not found')
  })

  it('字段级校验不弹浮层：那句话留给表单 inline 错误', () => {
    showApiError(
      new ApiError(
        'VALIDATION_ERROR',
        'placeholder',
        { field: 'name', rule: 'TOO_LONG' },
        'too long',
      ),
    )
    expect(useToastStore().items).toHaveLength(0)
  })

  it('业务成功：绿色，成功不再有码；用调用方给的前端文案，带上是谁的操作', () => {
    const ok = showOperationResult(
      { ok: true, message: 'backend words' },
      { context: '家庭群', successText: '测试消息已投递' },
    )
    expect(ok).toBe(true)
    const items = useToastStore().items
    expect(items[0]!.tone).toBe('success')
    expect(items[0]!.text).toBe('家庭群：测试消息已投递')
  })

  it('成功后端不给文案也不会空着（落回语言包那句）', () => {
    showOperationResult({ ok: true })
    expect(useToastStore().items[0]!.text.length).toBeGreaterThan(0)
  })

  it('软失败（还能用、只是这次没结果）：黄色，用调用方那句', () => {
    const ok = showOperationResult(
      { ok: false, code: 'INVALID_RESPONSE', message: 'backend words' },
      { context: 'V2EX', softText: '连接正常，但未获取到内容' },
    )
    expect(ok).toBe(false)
    const items = useToastStore().items
    expect(items[0]!.tone).toBe('warning')
    expect(items[0]!.text).toBe('V2EX：连接正常，但未获取到内容')
  })

  it('硬失败（凭证不对）：红色，文案按码映射，不铺后端原文', () => {
    const ok = showOperationResult(
      {
        ok: false,
        code: 'AUTH_FAILED',
        message: 'bot token 不对：Unauthorized',
        details: { reason: 'delivery.telegramAuth' },
      },
      { context: '家庭群' },
    )
    expect(ok).toBe(false)
    const items = useToastStore().items
    expect(items[0]!.tone).toBe('danger')
    expect(items[0]!.text).toBe('家庭群：认证失败，请检查密钥或凭证后重试')
    expect(items[0]!.text).not.toContain('Unauthorized')
  })

  it('可以再试的失败（超时）：黄色', () => {
    showOperationResult({ ok: false, code: 'TIMEOUT', message: '连接超时' })
    expect(useToastStore().items[0]!.tone).toBe('warning')
    expect(useToastStore().items[0]!.text).toBe(operationMessage('TIMEOUT'))
  })

  it('只有硬失败记日志：成功、软失败、可以再试的都不刷', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    showOperationResult({ ok: true })
    showOperationResult({ ok: false, code: 'TIMEOUT' })
    showOperationResult({ ok: false, code: 'INVALID_RESPONSE' }, { softText: '没内容' })
    expect(warn).not.toHaveBeenCalled()

    showOperationResult({ ok: false, code: 'AUTH_FAILED', message: 'Unauthorized' })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('kestrel')
    warn.mockRestore()
  })

  it('ApiError 把码、字段定位、后端原文都带在对象上，文案已经映射过', () => {
    const error = new ApiError(
      'VALIDATION_ERROR',
      apiErrorMessage('VALIDATION_ERROR', { rule: 'TOO_LONG' }),
      { field: 'apiKey', rule: 'TOO_LONG' },
      'apiKey is too long',
    )
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.details).toEqual({ field: 'apiKey', rule: 'TOO_LONG' })
    expect(error.message).toBe('内容长度超出上限')
    expect(error.serverMessage).toBe('apiKey is too long')
  })
})
