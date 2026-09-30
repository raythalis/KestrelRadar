import type { Db } from './db/index.ts'
import { createActionRepo } from './modules/actions/action.repo.ts'
import { createActionService } from './modules/actions/action.service.ts'
import { createChannelRepo } from './modules/channels/channel.repo.ts'
import { createChannelService } from './modules/channels/channel.service.ts'
import { createCollector, type Collector } from './modules/collection/collector.ts'
import { createScheduler, type Scheduler } from './modules/collection/scheduler.ts'
import { createDiscoveryRepo } from './modules/discoveries/discovery.repo.ts'
import { createDiscoveryService } from './modules/discoveries/discovery.service.ts'
import { createGroupRepo } from './modules/groups/group.repo.ts'
import { createGroupService } from './modules/groups/group.service.ts'
import { createItemRepo, type ItemRepo } from './modules/items/item.repo.ts'
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
  items: ItemRepo
  collector: Collector
  scheduler: Scheduler
}

export interface ContainerOptions {
  /** 采集结果写进服务日志，方便排查 */
  log?: (level: 'info' | 'warn', message: string) => void
}

/** 装配处：repo 与 service 的依赖关系只在这里写一次 */
export function buildContainer(db: Db, options: ContainerOptions = {}): Container {
  const groupRepo = createGroupRepo(db)
  const discoveryRepo = createDiscoveryRepo(db)
  const monitorRepo = createMonitorRepo(db)
  const actionRepo = createActionRepo(db)
  const channelRepo = createChannelRepo(db)
  const providerRepo = createModelProviderRepo(db)
  const modelRepo = createModelRepo(db)
  const settingsRepo = createSettingsRepo(db)
  const itemRepo = createItemRepo(db)

  const settings = createSettingsService(settingsRepo)
  const collector = createCollector({ discoveries: discoveryRepo, items: itemRepo, settings })

  const scheduler = createScheduler({
    collector,
    // 采集目标 = 自身启用 + 所在分组也启用
    targets: () =>
      discoveryRepo.list().map((discovery) => ({
        id: discovery.id,
        cronExpression: discovery.cronExpression,
        enabled: discovery.enabled && (groupRepo.get(discovery.groupId)?.enabled ?? false),
      })),
    concurrency: () => settings.get().concurrency,
    onResult: (outcome) => {
      const name = discoveryRepo.get(outcome.discoveryId)?.name ?? outcome.discoveryId
      if (!outcome.ok) {
        options.log?.('warn', `采集失败：${name} — ${outcome.message}`)
      } else if (outcome.newItemCount > 0) {
        options.log?.('info', `采集完成：${name} 新增 ${outcome.newItemCount} 条`)
      }
    },
  })

  return {
    groups: createGroupService(groupRepo),
    discoveries: createDiscoveryService(discoveryRepo, groupRepo, scheduler),
    monitors: createMonitorService(monitorRepo, groupRepo, actionRepo),
    actions: createActionService(actionRepo, groupRepo, channelRepo),
    channels: createChannelService(channelRepo),
    modelProviders: createModelProviderService(providerRepo, modelRepo),
    settings,
    items: itemRepo,
    collector,
    scheduler,
  }
}
