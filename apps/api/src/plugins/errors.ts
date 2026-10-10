import type { ApiErrorCode, ApiErrorDetails, ValidationRule } from '@kestrel/contracts'
import { API_PREFIX, validationRuleForIssue } from '@kestrel/contracts'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { DeliveryError } from '../modules/delivery/sender.ts'
import { noteRequestError } from '../request-context.ts'

/**
 * API Error：只表示「这次 HTTP 请求没成功」。
 *
 * 业务层面的成没成是另一件事，由业务结果（operation-result）表达，不走这里。
 */
export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: ApiErrorDetails

  constructor(code: ApiErrorCode, message: string, status: number, details?: ApiErrorDetails) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }

  static notFound(message: string): AppError {
    return new AppError('NOT_FOUND', message, 404)
  }

  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message, 409)
  }

  static validation(message: string, details?: ApiErrorDetails): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details)
  }
}

/** 人话描述：字段 + 原因，给日志和兜底展示用 */
export function describeIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}：${issue.message}`)
    .join('；')
}

/** 取第一条 issue 定位字段与规则：前端只需要一个明确指向 */
export function firstIssueDetails(error: ZodError): ApiErrorDetails | undefined {
  const first: unknown = error.issues[0]
  if (!first) return undefined
  const issue = first as {
    code: string
    path?: readonly (string | number)[]
    origin?: string
    type?: string
    params?: { rule?: ValidationRule }
  }
  return {
    field: (issue.path ?? []).join('.') || 'body',
    rule: validationRuleForIssue({
      code: issue.code,
      origin: issue.origin,
      type: issue.type,
      params: issue.params,
    }),
  }
}

/**
 * 4xx 也留一条痕：错误码挂到请求上，由请求行一行带走（状态码 + 错误码），
 * 不另起一行、也不打堆栈，免得同一个请求占两行。
 */
function noteClientError(request: FastifyRequest, code: ApiErrorCode): void {
  noteRequestError(request, code)
}

/** 只要不是 /api、也不是要具体文件（带扩展名），就当它是前端页面路由 */
function isPageRoute(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0] ?? ''
  if (path.startsWith(API_PREFIX)) return false
  return !/\.[a-z0-9]+$/i.test(path)
}

/**
 * 统一的错误出口：错误码 + 人话消息，绝不把堆栈抛给调用方。
 *
 * spaFallback：开了静态托管时，没匹配上的页面路由整条交给前端（回 index.html），
 * 不然用户在应用里刷新一次就吃到 404。
 */
export function registerErrorHandler(
  app: FastifyInstance,
  options: { spaFallback?: boolean } = {},
): void {
  const send = (
    reply: FastifyReply,
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetails,
  ) =>
    reply.status(status).send({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.status < 500) noteClientError(request, error.code)
      return send(reply, error.status, error.code, error.message, error.details)
    }
    if (error instanceof ZodError) {
      noteClientError(request, 'VALIDATION_ERROR')
      return send(reply, 400, 'VALIDATION_ERROR', describeIssues(error), firstIssueDetails(error))
    }
    // 发送失败本该由业务结果接口自己接住；漏到这里说明那条路径没收拾，按服务异常兜底并留下证据
    if (error instanceof DeliveryError) {
      request.log.error(
        { code: 'INTERNAL_ERROR', method: request.method, url: request.url, err: error },
        '投递失败漏到了 HTTP 出口',
      )
      return send(reply, 500, 'INTERNAL_ERROR', '服务器内部错误')
    }
    const statusCode = (error as { statusCode?: number }).statusCode
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      // 框架自己抛的客户端错误（请求体不合法之类）不该报成 500
      noteClientError(request, 'VALIDATION_ERROR')
      return send(reply, statusCode, 'VALIDATION_ERROR', '请求不合法，请检查后重试')
    }
    const message = (error as Error).message ?? ''
    if (message.includes('UNIQUE constraint failed')) {
      noteClientError(request, 'CONFLICT')
      return send(reply, 409, 'CONFLICT', '已经存在同样的记录')
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      noteClientError(request, 'CONFLICT')
      return send(reply, 409, 'CONFLICT', '还有别的地方在引用它，先解除引用再删')
    }
    // 兜底：日志里必须带错误码、堆栈与请求上下文，不能只有一句 message
    request.log.error(
      { code: 'INTERNAL_ERROR', method: request.method, url: request.url, err: error },
      'unhandled error',
    )
    return send(reply, 500, 'INTERNAL_ERROR', '服务器内部错误')
  })

  app.setNotFoundHandler((request, reply) => {
    if (options.spaFallback && request.method === 'GET' && isPageRoute(request)) {
      return reply.sendFile('index.html')
    }
    noteClientError(request, 'NOT_FOUND')
    return send(reply, 404, 'NOT_FOUND', '没有这个接口')
  })
}
