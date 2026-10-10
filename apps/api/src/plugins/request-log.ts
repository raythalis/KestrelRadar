import { API_PREFIX } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { requestErrorCode } from '../request-context.ts'

/**
 * 不逐条打的路径：健康检查每 30 秒来一次，打出来只会把有用的行刷走
 * （参考：MoviePilot 日志里满屏的 `GET /health/ready 200 OK`）。
 */
const SILENT_PATHS = new Set([`${API_PREFIX}/health`])

/**
 * 常规接口请求：一行一条，`GET /api/config 200（12ms）`。
 *
 * - 只打 `/api` 下的请求；静态资源与前端页面路由不打（那是刷屏，不是信号）
 * - 4xx 记 warn、5xx 记 error，带 `code` 字段（前端 Toast 按同一个码映射人话）
 * - 字段：`method`、`path`、`status`、`duration_ms`、`request_id`
 */
export function registerRequestLog(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    const path = request.url.split('?')[0] ?? ''
    if (!path.startsWith(API_PREFIX) || SILENT_PATHS.has(path)) return

    const status = reply.statusCode
    const durationMs = Math.round(reply.elapsedTime)
    const code = requestErrorCode(request)
    const fields = {
      method: request.method,
      path,
      status,
      duration_ms: durationMs,
      request_id: request.id,
      ...(code ? { code } : {}),
    }
    const message = `${request.method} ${path} ${status}（${durationMs}ms）`

    if (status >= 500) request.log.error(fields, message)
    else if (status >= 400) request.log.warn(fields, message)
    else request.log.info(fields, message)
  })
}
