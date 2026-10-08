import type { FastifyInstance } from 'fastify'

import type { EventService } from './event.service.ts'

/**
 * 仪表盘的最近事件：只读列表 + 来源清单 + 标已读。
 * 列表只看 24 小时窗口（contracts 里的 EVENT_WINDOW_HOURS），按最近一次发生时间倒序，
 * 一页一页给（cursor 游标），界面滚动到底部再要下一页。
 */
export function registerEventRoutes(app: FastifyInstance, service: EventService): void {
  app.get<{ Querystring: { cursor?: string; limit?: string; discoveryId?: string } }>(
    '/events',
    async (request) => {
      const { cursor, limit, discoveryId } = request.query
      return service.list({
        cursor,
        limit: limit === undefined || limit === '' ? undefined : Number(limit),
        discoveryId: discoveryId === '' ? undefined : discoveryId,
      })
    },
  )

  /** 来源筛选弹层用：窗口内每个来源有几个事件 */
  app.get('/events/sources', async () => service.sources())

  /** 点击查看后标已读 */
  app.post<{ Params: { id: string } }>('/events/:id/read', async (request) =>
    service.markRead(request.params.id),
  )
}
