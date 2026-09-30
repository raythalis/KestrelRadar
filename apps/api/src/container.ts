import type { Db } from './db/index.ts'
import { createActionRepo } from './modules/actions/action.repo.ts'
import { createActionService } from './modules/actions/action.service.ts'
import { createChannelRepo } from './modules/channels/channel.repo.ts'
import { createChannelService } from './modules/channels/channel.service.ts'
import { createDiscoveryRepo } from './modules/discoveries/discovery.repo.ts'
import { createDiscoveryService } from './modules/discoveries/discovery.service.ts'
import { createGroupRepo } from './modules/groups/group.repo.ts'
import { createGroupService } from './modules/groups/group.service.ts'
import { createModelProviderRepo } from './modules/model-providers/model-provider.repo.ts'
import { createModelProviderService } from './modules/model-providers/model-provider.service.ts'
import { createModelRepo } from './modules/model-providers/model.repo.ts'
import { createMonitorRepo } from './modules/monitors/monitor.repo.ts'
import { createMonitorService } from './modules/monitors/monitor.service.ts'
import { createSettingsRepo } from './modules/settings/settings.repo.ts'
import { createSettingsService } from './modules/settings/settings.service.ts'

export interface Container {
  groups: ReturnType<typeof createGroupService>
  discoveries: ReturnType<typeof createDiscoveryService>
  monitors: ReturnType<typeof createMonitorService>
  actions: ReturnType<typeof createActionService>
  channels: ReturnType<typeof createChannelService>
  modelProviders: ReturnType<typeof createModelProviderService>
  settings: ReturnType<typeof createSettingsService>
}

/** 装配处：repo 与 service 的依赖关系只在这里写一次 */
export function buildContainer(db: Db): Container {
  const groupRepo = createGroupRepo(db)
  const discoveryRepo = createDiscoveryRepo(db)
  const monitorRepo = createMonitorRepo(db)
  const actionRepo = createActionRepo(db)
  const channelRepo = createChannelRepo(db)
  const providerRepo = createModelProviderRepo(db)
  const modelRepo = createModelRepo(db)
  const settingsRepo = createSettingsRepo(db)

  return {
    groups: createGroupService(groupRepo),
    discoveries: createDiscoveryService(discoveryRepo, groupRepo),
    monitors: createMonitorService(monitorRepo, groupRepo, actionRepo),
    actions: createActionService(actionRepo, groupRepo, channelRepo),
    channels: createChannelService(channelRepo),
    modelProviders: createModelProviderService(providerRepo, modelRepo),
    settings: createSettingsService(settingsRepo),
  }
}
