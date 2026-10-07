import { z } from 'zod'

import { FAILURE_CODES, type FailureCode } from './failure-copy.ts'

/**
 * 业务操作结果码：HTTP 请求本身成功了（200 + success:true），说的是业务成没成。
 *
 * 与 api-error.ts 的错误码是两套体系，禁止互相复用。
 */
export const OPERATION_CODES = [
  // 没有 SUCCESS：成功由 ok=true 表达，业务码只描述失败
  'AUTH_FAILED',
  'TIMEOUT',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'INVALID_RESPONSE',
  'UNAVAILABLE',
] as const

export const operationCodeSchema = z.enum(OPERATION_CODES)
export type OperationCode = z.infer<typeof operationCodeSchema>

/**
 * 细码 → 业务码。
 * 细码（FAILURE_CODES）只给日志、异常统计和排查用，不直接展示给用户界面。
 */
export const FAILURE_TO_OPERATION: Record<FailureCode, OperationCode> = {
  'fetch.timeout': 'TIMEOUT',
  'fetch.http404': 'UNAVAILABLE',
  'fetch.http401or403': 'AUTH_FAILED',
  'fetch.httpStatus': 'UNAVAILABLE',
  'fetch.network': 'NETWORK_ERROR',
  'rsshub.baseMissing': 'UNAVAILABLE',
  'web.noFeedLink': 'INVALID_RESPONSE',
  'feed.noEntry': 'INVALID_RESPONSE',
  'feed.parseFailed': 'INVALID_RESPONSE',
  'discovery.missing': 'UNAVAILABLE',
  'collection.failed': 'UNAVAILABLE',
  'llm.unavailable': 'UNAVAILABLE',
  'llm.failed': 'UNAVAILABLE',
  'delivery.webhookNoUrl': 'AUTH_FAILED',
  'delivery.webhookStatus': 'INVALID_RESPONSE',
  'delivery.webhookTimeout': 'TIMEOUT',
  'delivery.webhookFailed': 'UNAVAILABLE',
  'delivery.notTelegram': 'UNAVAILABLE',
  'delivery.telegramNoToken': 'AUTH_FAILED',
  'delivery.telegramNoChat': 'AUTH_FAILED',
  'delivery.telegramTokenMissing': 'AUTH_FAILED',
  'delivery.telegramTimeout': 'TIMEOUT',
  'delivery.telegramAuth': 'AUTH_FAILED',
  'delivery.telegramFailed': 'UNAVAILABLE',
  'delivery.channelUnavailable': 'UNAVAILABLE',
  'delivery.failed': 'UNAVAILABLE',
}

/** 没有细码时按「对方不可用」归类 */
export function operationCodeOf(reason: FailureCode | null | undefined): OperationCode {
  return reason ? FAILURE_TO_OPERATION[reason] : 'UNAVAILABLE'
}

/**
 * 业务结果的统一形状：ok 才是业务成没成；code 只在 ok=false 时出现。
 *
 * 所有测试 / 采集 / 投递类接口都用这一套，不要各自维护字段：
 * 接口自己的负载放进 data，失败时可以没有 data。
 */
export function operationResultSchema<T extends z.ZodType = z.ZodUnknown>(
  data: T = z.unknown() as unknown as T,
) {
  return z.object({
    ok: z.boolean(),
    /** 业务失败码：成功没有这个字段（成功由 ok 表达） */
    code: operationCodeSchema.optional(),
    message: z.string(),
    /** 细码，只给日志与统计，界面不展示 */
    details: z.object({ reason: z.enum(FAILURE_CODES) }).optional(),
    /** 接口自己的负载；失败时可能没有 */
    data: data.optional(),
  })
}

/** 只有 ok / code / message 的裸业务结果（没有额外负载时用） */
export const plainOperationResultSchema = operationResultSchema()
export type PlainOperationResult = z.infer<typeof plainOperationResultSchema>

/** 业务结果接口的响应信封：success 只代表「请求成功」 */
export function operationResponseSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data })
}
