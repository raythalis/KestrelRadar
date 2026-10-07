import type { ZodType } from 'zod'

import { AppError, describeIssues, firstIssueDetails } from '../plugins/errors.ts'

/** 用同一套契约校验输入，失败转成带字段定位的 VALIDATION_ERROR */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw AppError.validation(describeIssues(result.error), firstIssueDetails(result.error))
  }
  return result.data
}
