import type { Db } from './db/index.ts'
import { createActionRepo } from './modules/actions/action.repo.ts'
import { createActionService } from './modules/actions/action.service.ts'
import { createChannelRepo } from './modules/channels/channel.repo.ts'
import { createChannelService } from './modules/channels/channel.service.ts'
import { createCollector, type Collector } from './modules/collection/collector.ts'
import { createScheduler, type Scheduler } from './modules/collection/scheduler.ts'
import { createDiscoveryRepo } from './modules/discoveries/discovery.repo.ts'
import { createDiscoveryService } from './modules/discoveries/discovery.service.ts'
import { createEventRepo, type EventRepo } from './modules/events/event.repo.ts'
import { createEventService } from './modules/events/event.service.ts'
import { createGroupRepo } from './modules/groups/group.repo.ts'
import { createGroupService } from './modules/groups/group.service.ts'
import { createItemRepo, type ItemRepo } from './modules/items/item.repo.ts'
import { createJudgeService } from './modules/judgment/judge.service.ts'
import { createJudgmentRepo, type JudgmentRepo } from './modules/judgment/judgment.repo.ts'
import type { JudgeLlm } from './modules/judgment/llm.ts'
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
  judgments: JudgmentRepo
  events: EventRepo
  merger: ReturnType<typeof createEventService>
  judge: ReturnType<typeof createJudgeService>
  collector: Collector
  scheduler: Scheduler
}

export interface ContainerOptions {
  /** 采集与判定的结果写进服务日志，方便排查 */
  log?: (level: 'info' | 'warn', message: string) => void
  /** 判定用的模型实现；不传就是「还没配模型」，走降级开关 */
  llm?: JudgeLlm
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
  const judgmentRepo = createJudgmentRepo(db)
  const eventRepo = createEventRepo(db)

  const settings = createSettingsService(settingsRepo)

  const judge = createJudgeService({
    monitors: monitorRepo,
    groups: groupRepo,
    discoveries: discoveryRepo,
    items: itemRepo,
    judgments: judgmentRepo,
    settings,
    llm: options.llm,
    log: options.log,
  })

  const merger = createEventService({
    events: eventRepo,
    discoveries: discoveryRepo,
    groups: groupRepo,
    items: itemRepo,
    settings,
  })

  const collector = createCollector({
    discoveries: discoveryRepo,
    items: itemRepo,
    settings,
    // 采到新条目就顺手判一遍：判定失败不影响采集结果
    onCollected: async (discoveryId) => {
      try {
        const written = await judge.judgePendingItems(discoveryId)
        if (written > 0) options.log?.('info', `判定完成：新判 ${written} 条`)
      } catch (error) {
        options.log?.('warn', `判定失败：${(error as Error).message}`)
      }
      try {
        const merged = await merger.mergePendingItems(discoveryId)
        if (merged.created > 0 || merged.merged > 0) {
          options.log?.(
            'info',
            `归并完成：新建事件 ${merged.created} 个，并入已有事件 ${merged.merged} 条`,
          )
        }
      } catch (error) {
        options.log?.('warn', `归并失败：${(error as Error).message}`)
      }
    },
  })

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
    judgments: judgmentRepo,
    events: eventRepo,
    merger,
    judge,
    collector,
    scheduler,
  }
}
