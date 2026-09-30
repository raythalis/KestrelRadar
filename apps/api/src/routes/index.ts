import { API_PREFIX } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import type { Container } from '../container.ts'
import { registerActionRoutes } from '../modules/actions/action.routes.ts'
import { registerChannelRoutes } from '../modules/channels/channel.routes.ts'
import { registerConfigRoutes } from '../modules/config/config.routes.ts'
import { registerDeliveryRoutes } from '../modules/delivery/delivery.routes.ts'
import { registerDiscoveryRoutes } from '../modules/discoveries/discovery.routes.ts'
import { registerGroupRoutes } from '../modules/groups/group.routes.ts'
import { registerJudgmentRoutes } from '../modules/judgment/judgment.routes.ts'
import { registerModelProviderRoutes } from '../modules/model-providers/model-provider.routes.ts'
import { registerMonitorRoutes } from '../modules/monitors/monitor.routes.ts'
import { registerSettingsRoutes } from '../modules/settings/settings.routes.ts'

export function registerRoutes(app: FastifyInstance, container: Container): void {
  app.get('/health', async () => ({ status: 'ok', apiPrefix: API_PREFIX }))

  const resync = (): void => container.scheduler.sync()

  registerGroupRoutes(app, container.groups, resync)
  registerDiscoveryRoutes(app, container.discoveries, container.collector, resync)
  registerMonitorRoutes(app, container.monitors)
  registerJudgmentRoutes(app, container.judge)
  registerActionRoutes(app, container.actions)
  registerChannelRoutes(app, container.channels)
  registerDeliveryRoutes(app, container.delivery)
  registerModelProviderRoutes(app, container.modelProviders)
  registerSettingsRoutes(app, container.settings)
  registerConfigRoutes(app, container)
}
