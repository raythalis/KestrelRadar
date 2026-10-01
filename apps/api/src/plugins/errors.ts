import type { ErrorCode } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

import { DeliveryError } from '../modules/delivery/sender.ts'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number

  constructor(code: ErrorCode, message: string, status: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }

  static notFound(message: string): AppError {
    return new AppError('not_found', message, 404)
  }

  static conflict(message: string): AppError {
    return new AppError('conflict', message, 409)
  }

  static validation(message: string): AppError {
    return new AppError('validation_error', message, 400)
  }
}

function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}：${issue.message}`)
    .join('；')
}

/** 统一的错误出口：错误码 + 人话消息，绝不把堆栈抛给调用方 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message } })
    }
    // 投递失败（token 不对、地址不通之类）是用户能自己改的问题，别报成 500
    if (error instanceof DeliveryError) {
      return reply.status(400).send({ error: { code: 'delivery_error', message: error.message } })
    }
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send({ error: { code: 'validation_error', message: describeZodError(error) } })
    }
    const statusCode = (error as { statusCode?: number }).statusCode
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      // 框架自己抛的客户端错误（请求体不合法之类）不该报成 500
      return reply
        .status(statusCode)
        .send({ error: { code: 'validation_error', message: '请求不合法，请检查后重试' } })
    }
    const message = (error as Error).message ?? ''
    if (message.includes('UNIQUE constraint failed')) {
      return reply.status(409).send({ error: { code: 'conflict', message: '已经存在同样的记录' } })
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      return reply
        .status(409)
        .send({ error: { code: 'conflict', message: '还有别的地方在引用它，先解除引用再删' } })
    }
    app.log.error(error)
    return reply.status(500).send({ error: { code: 'internal', message: '服务器内部错误' } })
  })

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ error: { code: 'not_found', message: '没有这个接口' } })
  })
}
