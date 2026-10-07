import type { Db } from './db/index.ts'
import { createActionRepo } from './modules/actions/action.repo.ts'
import { createActionService } from './modules/actions/action.service.ts'
import { createChannelRepo } from './modules/channels/channel.repo.ts'
import { createChannelService } from './modules/channels/channel.service.ts'
import { createCollector, type Collector } from './modules/collection/collector.ts'
import { createRunRepo, type RunRepo } from './modules/collection/run.repo.ts'
import { createScheduler, type Scheduler } from './modules/collection/scheduler.ts'
import { createRsshubRoutes } from './modules/config/rsshub-routes.ts'
import { createRsshubStatus, type RsshubStatus } from './modules/config/rsshub-status.ts'
import { createDiscoveryRepo } from './modules/discoveries/discovery.repo.ts'
import { createDiscoveryService } from './modules/discoveries/discovery.service.ts'
import { builtinTemplates } from './modules/templates/builtin.ts'
import { createTemplateRepo } from './modules/templates/template.repo.ts'
import {
  createTemplateService,
  type TemplateService,
} from './modules/templates/template.service.ts'
import { createChannelBatcher, type ChannelBatcher } from './modules/delivery/batch.ts'
import { createDeliveryRepo, type DeliveryRepo } from './modules/delivery/delivery.repo.ts'
import { createDeliveryService, type DeliveryService } from './modules/delivery/delivery.service.ts'
import { createDeliverySender } from './modules/delivery/dispatcher.ts'
import type { DeliverySender } from './modules/delivery/sender.ts'
import { createTelegramGateway, type TelegramGateway } from './modules/delivery/telegram.ts'
import { createEventRepo, type EventRepo } from './modules/events/event.repo.ts'
import { createEventService } from './modules/events/event.service.ts'
import { createGroupRepo } from './modules/groups/group.repo.ts'
import { createGroupGate } from './modules/groups/group-gate.ts'
import { createGroupService } from './modules/groups/group.service.ts'
import { createIncidentRepo } from './modules/incidents/incident.repo.ts'
import {
  createIncidentService,
  type IncidentService,
} from './modules/incidents/incident.service.ts'
import { createIconService, type IconService } from './modules/icons/icon.service.ts'
import { createItemRepo, type ItemRepo } from './modules/items/item.repo.ts'
import { createJudgeService } from './modules/judgment/judge.service.ts'
import { createJudgmentRepo, type JudgmentRepo } from './modules/judgment/judgment.repo.ts'
import { createProviderLlm, type LlmTarget } from './modules/judgment/llm-client.ts'
import type { JudgeLlm } from './modules/judgment/llm.ts'
import { createModelProviderRepo } from './modules/model-providers/model-provider.repo.ts'
import { createRemoteModels } from './modules/model-providers/remote-models.ts'
import { createModelProviderService } from './modules/model-providers/model-provider.service.ts'
import { createMonitorRepo } from './modules/monitors/monitor.repo.ts'
import { createMonitorService } from './modules/monitors/monitor.service.ts'
import { createHiddenSettings, type HiddenSettings } from './modules/settings/hidden.ts'
import { createStatsService, type StatsService } from './modules/stats/stats.service.ts'
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
  hidden: HiddenSettings
  incidents: IncidentService
  runs: RunRepo
  /** 图标抓取；测试里没给目录就没有这个能力 */
  icons?: IconService
  iconDir?: string
  stats: StatsService
  /** RSSHub 连通性探测（设置页的测试按钮、仪表盘那张卡都用它） */
  rsshub: RsshubStatus
  items: ItemRepo
  judgments: JudgmentRepo
  events: EventRepo
  merger: ReturnType<typeof createEventService>
  deliveries: DeliveryRepo
  delivery: DeliveryService
  templates: TemplateService
  batcher: ChannelBatcher
  judge: ReturnType<typeof createJudgeService>
  collector: Collector
  scheduler: Scheduler
}

export interface ContainerOptions {
  /** 采集与判定的结果写进服务日志，方便排查 */
  log?: (level: 'info' | 'warn', message: string) => void
  /** 判定用的模型实现；不传就按设置里的模型顺序真去调（顺序为空=还没配模型，走降级开关） */
  llm?: JudgeLlm
  /** 调模型用的 fetch；测试里换成假的，平时不传 */
  llmFetch?: typeof fetch
  /** 投递用的发送器；不传就是真的往 Webhook 发 */
  sender?: DeliverySender
  telegram?: TelegramGateway
  /** 渠道合并窗口；测试里给一个很短的窗口 */
  batcher?: ChannelBatcher
  /** 图标存哪；不传就不抓图标（与数据库同级目录下的 icons/） */
  iconDir?: string
  /** 测试用：替掉真网络（图标抓取、RSSHub 探测都走它） */
  fetchImpl?: typeof fetch
}

/** 装配处：repo 与 service 的依赖关系只在这里写一次 */
export function buildContainer(db: Db, options: ContainerOptions = {}): Container {
  const groupRepo = createGroupRepo(db)
  const discoveryRepo = createDiscoveryRepo(db)
  const monitorRepo = createMonitorRepo(db)
  const actionRepo = createActionRepo(db)

  /** 分组开关与组内卡片的联动（分组服务往下传、三个子服务往上传） */
  const groupGate = createGroupGate({
    db,
    groups: groupRepo,
    discoveries: discoveryRepo,
    monitors: monitorRepo,
    actions: actionRepo,
  })
  const channelRepo = createChannelRepo(db)
  const providerRepo = createModelProviderRepo(db)
  const settingsRepo = createSettingsRepo(db)
  const itemRepo = createItemRepo(db)
  const judgmentRepo = createJudgmentRepo(db)
  const eventRepo = createEventRepo(db)
  const deliveryRepo = createDeliveryRepo(db)
  const templateRepo = createTemplateRepo(db)

  const settings = createSettingsService(settingsRepo)
  const fetchImpl = options.llmFetch ?? fetch
  const remoteModels = createRemoteModels({
    timeoutMs: () => settings.get().llmTimeoutSeconds * 1000,
    fetchImpl,
    log: options.log,
  })
  const hidden = createHiddenSettings(settingsRepo)
  const runs = createRunRepo(db)

  // 异常：三类共一张表；库里与前端同为 hidden.incidentLimit 条（默认 20）
  const incidents = createIncidentService({
    repo: createIncidentRepo(db),
    limits: () => ({
      limit: hidden.incidentLimit(),
      dedupMinutes: hidden.incidentDedupMinutes(),
    }),
  })

  /**
   * 判定用的模型顺序（设置里的 judgeModelOrder）→ 能真正发请求的调用目标。
   * 顺序里引用的模型或供应商已经不在了、或被停用了，就跳过它，让后面的顶上。
   */
  function llmTargets(): LlmTarget[] {
    const targets: LlmTarget[] = []
    for (const entry of settings.get().judgeModelOrder) {
      // 存的是「供应商 id:模型名」，供应商已经没了就跳过它，让后面的顶上
      const separator = entry.indexOf(':')
      if (separator <= 0) continue
      const providerId = entry.slice(0, separator)
      const modelName = entry.slice(separator + 1)
      if (modelName.length === 0) continue
      const provider = providerRepo.get(providerId)
      if (!provider || !provider.enabled) continue
      targets.push({
        modelId: entry,
        modelName,
        providerName: provider.name,
        baseUrl: provider.baseUrl,
        apiKey: providerRepo.readApiKey(provider.id),
      })
    }
    return targets
  }

  const judge = createJudgeService({
    monitors: monitorRepo,
    groups: groupRepo,
    discoveries: discoveryRepo,
    items: itemRepo,
    judgments: judgmentRepo,
    settings,
    incidents,
    // 顺序为空时它自己会报「还没有配置可用的判定模型」，跟以前的空壳行为一致
    llm:
      options.llm ??
      createProviderLlm({
        targets: llmTargets,
        timeoutSeconds: () => settings.get().llmTimeoutSeconds,
        maxRetries: () => settings.get().llmMaxRetries,
        fetchImpl,
        log: options.log,
      }),
    log: options.log,
  })

  const merger = createEventService({
    events: eventRepo,
    discoveries: discoveryRepo,
    groups: groupRepo,
    items: itemRepo,
    judgments: judgmentRepo,
    monitors: monitorRepo,
    settings,
  })

  const templates = createTemplateService({ repo: templateRepo, builtin: builtinTemplates() })

  // RSSHub 相对路由的源站反查：给图标抓取用（实例地址跟着设置走）
  const rsshubRoutes = createRsshubRoutes({ settings, fetchImpl: options.fetchImpl })

  const icons = options.iconDir
    ? createIconService({
        discoveries: discoveryRepo,
        dir: options.iconDir,
        fetchImpl: options.fetchImpl,
        rsshubHost: (target) => rsshubRoutes.resolveHost(target),
      })
    : undefined
  const rsshub = createRsshubStatus({ settings, fetchImpl: options.fetchImpl })

  const telegram = options.telegram ?? createTelegramGateway()
  // 推送超时跟着设置走：改了立刻生效，不用重启
  const sender =
    options.sender ??
    createDeliverySender({ timeoutSeconds: () => settings.get().deliveryTimeoutSeconds })
  const batcher = options.batcher ?? createChannelBatcher(sender)
  const delivery = createDeliveryService({
    actions: actionRepo,
    monitors: monitorRepo,
    groups: groupRepo,
    discoveries: discoveryRepo,
    items: itemRepo,
    judgments: judgmentRepo,
    events: eventRepo,
    deliveries: deliveryRepo,
    channels: channelRepo,
    settings,
    templates,
    telegram,
    sender,
    batcher,
    incidents,
    log: options.log,
  })

  const collector = createCollector({
    discoveries: discoveryRepo,
    items: itemRepo,
    settings,
    incidents,
    runs,
    groups: groupRepo,
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
      // 「发现即发」的动作：归并完顺手投递一次
      try {
        const groupId = discoveryRepo.get(discoveryId)?.groupId
        if (groupId) {
          const outcomes = await delivery.deliverInstantForGroup(groupId)
          for (const outcome of outcomes) {
            if (outcome.messageCount > 0) options.log?.('info', `投递完成：${outcome.message}`)
            else if (!outcome.ok) options.log?.('warn', `投递异常：${outcome.message}`)
          }
        }
      } catch (error) {
        options.log?.('warn', `投递失败：${(error as Error).message}`)
      }
    },
  })

  const stats = createStatsService({
    groups: groupRepo,
    discoveries: discoveryRepo,
    monitors: monitorRepo,
    actions: actionRepo,
    channels: channelRepo,
    events: eventRepo,
    deliveries: deliveryRepo,
    judgments: judgmentRepo,
    runs,
    settings,
    hidden,
    rsshub,
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
    // 汇总动作：每天 HH:MM 那种，到点投递
    digestTargets: () =>
      actionRepo.list().map((action) => ({
        id: action.id,
        cronExpression: action.cronExpression ?? '',
        enabled:
          action.enabled &&
          action.triggerType === 'digest' &&
          (groupRepo.get(action.groupId)?.enabled ?? false),
      })),
    onDigest: async (actionId) => {
      const outcome = await delivery.deliverForAction(actionId, 'digest')
      if (outcome.messageCount > 0) options.log?.('info', `汇总投递完成：${outcome.message}`)
    },
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
    rsshub,
    groups: createGroupService(groupRepo, groupGate),
    discoveries: createDiscoveryService(discoveryRepo, groupRepo, groupGate, scheduler),
    monitors: createMonitorService(monitorRepo, groupRepo, actionRepo, groupGate),
    actions: createActionService(actionRepo, groupRepo, channelRepo, groupGate),
    channels: createChannelService(channelRepo),
    modelProviders: createModelProviderService(providerRepo, remoteModels),
    settings,
    hidden,
    incidents,
    runs,
    icons,
    iconDir: options.iconDir,
    stats,
    items: itemRepo,
    judgments: judgmentRepo,
    events: eventRepo,
    merger,
    deliveries: deliveryRepo,
    delivery,
    templates,
    batcher,
    judge,
    collector,
    scheduler,
  }
}
