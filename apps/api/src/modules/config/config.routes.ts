import type { ConfigSnapshot, StatsRsshub } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import type { Container } from '../../container.ts'

/** 前端一次拉全量配置的只读快照；不含任何密钥明文 */
export function registerConfigRoutes(app: FastifyInstance, container: Container): void {
  app.get('/config', async (): Promise<ConfigSnapshot> => {
    return {
      groups: container.groups.list(),
      discoveries: container.discoveries.list(),
      monitors: container.monitors.list(),
      actions: container.actions.list(),
      channels: container.channels.list(),
      modelProviders: container.modelProviders.listProviders(),
      templates: container.templates.list(),
      settings: container.settings.get(),
    }
  })

  /**
   * RSSHub 连通性测试：设置页那个按钮用的。
   * 只发一个 GET 探测，不写日志、不落库；force=1 时跳过 20 秒缓存重新探。
   */
  app.get<{ Querystring: { force?: string; baseUrl?: string } }>(
    '/config/rsshub-status',
    async (request): Promise<StatsRsshub> => {
      return container.rsshub.probe(request.query.force === '1', request.query.baseUrl)
    },
  )
}
