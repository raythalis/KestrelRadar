import { EVENT_LIST_LIMIT } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import type { EventService } from './event.service.ts'

/**
 * 仪表盘的最近事件列表：只读。
 * 条数固定（需求：最近 20 条），按最近一次发生时间倒序；归档的不返回。
 */
export function registerEventRoutes(app: FastifyInstance, service: EventService): void {
  app.get('/events', async () => service.listRecent(EVENT_LIST_LIMIT))
}
