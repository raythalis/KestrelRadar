import type { ZodType } from 'zod'

import { AppError } from '../plugins/errors.ts'

/** 用同一套契约校验输入，失败转成人话的 validation_error */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}：${issue.message}`)
      .join('；')
    throw AppError.validation(detail)
  }
  return result.data
}
