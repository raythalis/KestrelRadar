import { API_PREFIX } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { requestErrorCode } from '../request-context.ts'

/**
 * 不逐条打的路径：健康检查每 30 秒来一次，打出来只会把有用的行刷走
 * （参考：MoviePilot 日志里满屏的 `GET /health/ready 200 OK`）。
 */
const SILENT_PATHS = new Set([`${API_PREFIX}/health`])

/**
 * 常规接口请求：一行一条，`GET /api/config 200，用时 12ms`。
 *
 * - 只打 `/api` 下的请求；静态资源与前端页面路由不打（那是刷屏，不是信号）
 * - 4xx 记 warn、5xx 记 error，行尾带错误码（前端 Toast 按同一个码映射人话）
 * - 走根 logger 而不是 request.log：request.log 会绑一个 `reqId`，行尾就多出一串
 *   `{"reqId":"..."}`，这正是要避开的观感问题
 */
export function registerRequestLog(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    const path = request.url.split('?')[0] ?? ''
    if (!path.startsWith(API_PREFIX) || SILENT_PATHS.has(path)) return

    const status = reply.statusCode
    const durationMs = Math.round(reply.elapsedTime)
    const code = requestErrorCode(request)
    // 有错误码就报错误码（前端按同一个码显示人话），否则报耗时
    const message = code
      ? `${request.method} ${path} ${status}，${code}`
      : `${request.method} ${path} ${status}，用时 ${durationMs}ms`

    // 只传正文：行尾不再挂一串字段，读起来干净
    if (status >= 500) app.log.error(message)
    else if (status >= 400) app.log.warn(message)
    else app.log.info(message)
  })
}
