import type { ApiErrorCode } from '@kestrel/contracts'
import type { FastifyRequest } from 'fastify'

/**
 * 请求上挂的临时信息：一个请求只留一条请求行，所以错误码先挂在这里，
 * 由请求行统一带走（状态码 + 错误码），不必再补一条错误行。
 */
const codes = new WeakMap<FastifyRequest, ApiErrorCode>()

export function noteRequestError(request: FastifyRequest, code: ApiErrorCode): void {
  codes.set(request, code)
}

export function requestErrorCode(request: FastifyRequest): ApiErrorCode | undefined {
  return codes.get(request)
}
