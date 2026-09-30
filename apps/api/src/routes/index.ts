import { API_PREFIX } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import type { Container } from '../container.ts'
import { registerActionRoutes } from '../modules/actions/action.routes.ts'
import { registerChannelRoutes } from '../modules/channels/channel.routes.ts'
import { registerConfigRoutes } from '../modules/config/config.routes.ts'
import { registerDiscoveryRoutes } from '../modules/discoveries/discovery.routes.ts'
import { registerGroupRoutes } from '../modules/groups/group.routes.ts'
import { registerModelProviderRoutes } from '../modules/model-providers/model-provider.routes.ts'
import { registerMonitorRoutes } from '../modules/monitors/monitor.routes.ts'
import { registerSettingsRoutes } from '../modules/settings/settings.routes.ts'

export function registerRoutes(app: FastifyInstance, container: Container): void {
  app.get('/health', async () => ({ status: 'ok', apiPrefix: API_PREFIX }))

  registerGroupRoutes(app, container.groups)
  registerDiscoveryRoutes(app, container.discoveries)
  registerMonitorRoutes(app, container.monitors)
  registerActionRoutes(app, container.actions)
  registerChannelRoutes(app, container.channels)
  registerModelProviderRoutes(app, container.modelProviders)
  registerSettingsRoutes(app, container.settings)
  registerConfigRoutes(app, container)
}
