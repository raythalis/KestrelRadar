import type { ConfigSnapshot } from '@kestrel/contracts'
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
      models: container.modelProviders.listModels(),
      templates: container.templates.list(),
      settings: container.settings.get(),
    }
  })
}
