/**
 * 浮层提示的统一出口：文案、等级、要不要记日志，全在这里定。
 *
 * 规矩（2026-10-07 定版）：
 * - 文案一律走语言包：码 → i18n key → 当前语言的文案（见 locales 里的 error / operation / field 三组）；
 * - 后端 message 只当兜底与日志，不直接铺到界面上；
 * - 请求失败（HTTP 非 2xx）= API Error：按 error.code 映射，一律 danger；
 * - 业务失败（HTTP 200 + ok=false）= Business Result：按 data.code 映射，
 *   要动手的算 danger、可以再试的算 warning；成功由 ok=true 表达，没有成功码；
 * - 字段级校验（有 details.field）不走浮层，留给表单自己的 inline 错误；
 * - 认不出来的码先退回后端原文，再不行给一句通用文案，绝不把英文码当文案。
 * - 文案口径：书面、陈述事实 + 指明动作，统一「请…」；不口语化、不带感叹、不猜原因。
 */
import type {
  ApiErrorCode,
  ApiErrorDetails,
  FailureCode,
  OperationCode,
  ValidationRule,
} from '@kestrel/contracts'

import i18n from '@/plugins/i18n'
import { useToastStore, type ToastTone } from '@/stores/toast'

/** 取当前语言的文案：语言包没就绪也不该把提示变成一次异常 */
function tr(key: string): string {
  try {
    return i18n.global.t(key)
  } catch {
    return key
  }
}

/** 请求失败的码 → 语言包 key */
const API_KEYS: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: 'error.validation',
  NOT_FOUND: 'error.notFound',
  CONFLICT: 'error.conflict',
  FORBIDDEN: 'error.forbidden',
  UNAUTHORIZED: 'error.unauthorized',
  INTERNAL_ERROR: 'error.internal',
}

/** 字段级规则 → 语言包 key（表单 inline 错误优先用它） */
const RULE_KEYS: Record<ValidationRule, string> = {
  REQUIRED_FIELD: 'field.required',
  INVALID_FORMAT: 'field.format',
  INVALID_URL: 'field.url',
  INVALID_CRON: 'field.cron',
  OUT_OF_RANGE: 'field.range',
  TOO_LONG: 'field.tooLong',
  TOO_MANY_ITEMS: 'field.tooMany',
}

/** 业务失败码 → 语言包 key（成功没有码） */
const OPERATION_KEYS: Record<OperationCode, string> = {
  AUTH_FAILED: 'operation.authFailed',
  TIMEOUT: 'operation.timeout',
  NETWORK_ERROR: 'operation.network',
  RATE_LIMITED: 'operation.rateLimited',
  INVALID_RESPONSE: 'operation.invalidResponse',
  UNAVAILABLE: 'operation.unavailable',
}

/** 这几类是「得你动手」：凭证不对、对方给的东西用不了；其余失败先当「可以再试」 */
const OPERATION_HARD: OperationCode[] = ['AUTH_FAILED', 'INVALID_RESPONSE']

/** 没有码可用时的兜底、请求根本没到后端、以及成功的默认话 */
const UNKNOWN_KEY = 'error.unknown'
const OFFLINE_KEY = 'error.offline'
const SUCCESS_KEY = 'operation.success'

/** 请求失败：码 → 语言包；认不出来才退回后端原文，再不行才是通用话 */
export function apiErrorMessage(
  code: ApiErrorCode | null,
  details?: ApiErrorDetails,
  serverMessage = '',
): string {
  if (code === null) return tr(OFFLINE_KEY)
  if (code === 'VALIDATION_ERROR' && details?.rule) {
    const ruleKey = RULE_KEYS[details.rule]
    if (ruleKey) return tr(ruleKey)
  }
  const key = API_KEYS[code]
  return key ? tr(key) : serverMessage || tr(UNKNOWN_KEY)
}

/** 业务失败：码 → 语言包；没有码或认不出来才退回后端原文 */
export function operationMessage(code: OperationCode | undefined, serverMessage = ''): string {
  const key = code ? OPERATION_KEYS[code] : undefined
  return key ? tr(key) : serverMessage || tr(UNKNOWN_KEY)
}

/** 业务失败要什么等级：要动手的 danger，可以再试的 warning */
export function operationTone(code: OperationCode | undefined): ToastTone {
  return code && OPERATION_HARD.includes(code) ? 'danger' : 'warning'
}

/** 浮层还没就绪（单测里没建 pinia）不该把失败再变成一次异常 */
function pushToast(text: string, tone: ToastTone): void {
  try {
    useToastStore().push(text, tone)
  } catch {
    // 提示只是提示，不该反过来影响流程
  }
}

/** 只有硬失败记一条：成功与软失败不刷日志；只记码与原文，不记用户数据 */
function logFailure(scope: string, payload: Record<string, unknown>): void {
  console.warn(`[kestrel] ${scope}`, payload)
}

/** 请求失败的样子（`ApiError` 满足它，这里不反向依赖 api/http） */
export interface ApiErrorLike {
  code: ApiErrorCode | null
  /** 映射好的展示文案 */
  message?: string
  details?: ApiErrorDetails
  /** 后端原文：只给兜底与日志 */
  serverMessage?: string
}

/**
 * 请求失败统一在这里报：一律 danger。
 * 带 details.field 的字段级校验不弹浮层 —— 那句话归表单的 inline 错误说。
 */
export function showApiError(error: ApiErrorLike): void {
  const serverMessage = error.serverMessage ?? error.message ?? ''
  if (error.details?.field) {
    logFailure('api validation', {
      code: error.code,
      field: error.details.field,
      rule: error.details.rule,
      message: serverMessage,
    })
    return
  }
  logFailure('api error', {
    code: error.code,
    rule: error.details?.rule,
    message: serverMessage,
  })
  pushToast(apiErrorMessage(error.code, error.details, serverMessage), 'danger')
}

/** 业务结果的样子（采集测试 / 连通测试这类接口的 `data` 就是它） */
export interface OperationResultLike {
  ok: boolean
  /** 业务失败码：成功没有这个字段 */
  code?: OperationCode
  /** 后端原话：只在码认不出来时兜底 */
  message?: string
  /** 细码：只进日志，界面不展示 */
  details?: { reason?: FailureCode }
}

export interface OperationFeedbackOptions {
  /** 谁的操作（渠道名 / 数据源名）：同时冒几条提示时能分清 */
  context?: string
  /** 成功时说的那句前端文案（调用方知道这里「成了」是什么事）；不给就用通用那句 */
  successText?: string
  /** 调用方判定这是「还能用、只是这次没结果」时给的一句前端文案；给了它按 warning 报 */
  softText?: string
}

/**
 * 业务结果统一在这里报：成功 success、软失败 warning、硬失败 danger。
 * 返回业务成没成，调用方据此更新卡片自己的状态（例如渠道卡的圆点）。
 */
export function showOperationResult(
  result: OperationResultLike,
  options: OperationFeedbackOptions = {},
): boolean {
  const prefix = options.context ? `${options.context}：` : ''
  const serverMessage = result.message ?? ''

  if (result.ok) {
    pushToast(`${prefix}${options.successText ?? tr(SUCCESS_KEY)}`, 'success')
    return true
  }

  if (options.softText) {
    pushToast(`${prefix}${options.softText}`, 'warning')
    return false
  }

  const tone = operationTone(result.code)
  if (tone === 'danger') {
    logFailure('operation failed', {
      code: result.code,
      reason: result.details?.reason,
      message: serverMessage,
    })
  }
  pushToast(`${prefix}${operationMessage(result.code, serverMessage)}`, tone)
  return false
}
