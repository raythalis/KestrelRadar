import { z } from 'zod'

/**
 * API Error 错误码：只表示「这次 HTTP 请求没成功」。
 *
 * 业务层面的成没成是另一回事，见 operation-result.ts 里的业务码。
 * 两套码分开维护，永远不要互相复用（API Error 里不出现 AUTH_FAILED / TIMEOUT，
 * 业务结果里也不出现 VALIDATION_ERROR / NOT_FOUND）。
 */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'INTERNAL_ERROR',
] as const

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES)
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

/** 校验失败的细分规则：只出现在 details.rule 里，给前端定位字段用 */
export const VALIDATION_RULES = [
  'REQUIRED_FIELD',
  'INVALID_FORMAT',
  'INVALID_URL',
  'INVALID_CRON',
  'OUT_OF_RANGE',
  'TOO_LONG',
  'TOO_MANY_ITEMS',
] as const

export const validationRuleSchema = z.enum(VALIDATION_RULES)
export type ValidationRule = z.infer<typeof validationRuleSchema>

export const apiErrorDetailsSchema = z.object({
  /** 出问题的字段，点分路径（如 config.url） */
  field: z.string().optional(),
  /** 哪条规则没过 */
  rule: validationRuleSchema.optional(),
})
export type ApiErrorDetails = z.infer<typeof apiErrorDetailsSchema>

/** 统一错误响应：success 恒为 false，message 只用于日志与兜底展示 */
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: apiErrorDetailsSchema.optional(),
  }),
})
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>

/** zod issue 的最小形状（v3 / v4 字段名都兼容，不依赖具体版本的类型） */
export interface ZodIssueLike {
  code: string
  path?: readonly (string | number)[]
  origin?: string
  type?: string
  params?: { rule?: ValidationRule }
}

/** zod issue → 细分规则：认不出来的一律当格式问题，绝不猜字段名 */
export function validationRuleForIssue(issue: ZodIssueLike): ValidationRule {
  const marked = issue.params?.rule
  if (marked) return marked
  const kind = issue.origin ?? issue.type ?? ''
  switch (issue.code) {
    case 'invalid_type':
    case 'too_small':
      return kind === 'number'
        ? 'OUT_OF_RANGE'
        : kind === 'array'
          ? 'REQUIRED_FIELD'
          : 'REQUIRED_FIELD'
    case 'too_big':
      if (kind === 'array') return 'TOO_MANY_ITEMS'
      if (kind === 'number') return 'OUT_OF_RANGE'
      if (kind === 'set') return 'TOO_MANY_ITEMS'
      return 'TOO_LONG'
    case 'invalid_format':
    case 'invalid_string':
    case 'invalid_enum_value':
    case 'invalid_value':
    case 'invalid_literal':
      return 'INVALID_FORMAT'
    case 'not_multiple_of':
    case 'not_finite':
      return 'OUT_OF_RANGE'
    default:
      return 'INVALID_FORMAT'
  }
}
