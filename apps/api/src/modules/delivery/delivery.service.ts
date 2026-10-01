import type { Action, ChannelTestResult } from '@kestrel/contracts'

import { DeliveryError } from './sender.ts'

import type { ActionRepo } from '../actions/action.repo.ts'
import type { ChannelRepo } from '../channels/channel.repo.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { Event, EventRepo } from '../events/event.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { Item, ItemRepo } from '../items/item.repo.ts'
import type { JudgmentRepo } from '../judgment/judgment.repo.ts'
import type { MonitorRepo } from '../monitors/monitor.repo.ts'
import type { SettingsService } from '../settings/settings.service.ts'
import type { TemplateService } from '../templates/template.service.ts'
import type { TelegramChat, TelegramGateway } from './telegram.ts'
import type { ChannelBatcher } from './batch.ts'
import type { DeliveryRepo } from './delivery.repo.ts'
import type { DeliverySender } from './sender.ts'
import { renderTemplate } from './template.ts'

export type DeliveryTrigger = 'instant' | 'digest'

export interface DeliveryOutcome {
  actionId: string
  ok: boolean
  trigger: DeliveryTrigger
  /** 这次真的发了几条消息 */
  messageCount: number
  /** 覆盖了几条命中 */
  itemCount: number
  message: string
}

export interface DeliveryDeps {
  actions: ActionRepo
  monitors: MonitorRepo
  groups: GroupRepo
  discoveries: DiscoveryRepo
  items: ItemRepo
  judgments: JudgmentRepo
  events: EventRepo
  deliveries: DeliveryRepo
  channels: ChannelRepo
  settings: SettingsService
  templates: TemplateService
  telegram: TelegramGateway
  sender: DeliverySender
  batcher: ChannelBatcher
  log?: (level: 'info' | 'warn', message: string) => void
}

const DAY_MS = 24 * 60 * 60 * 1000

export function createDeliveryService(deps: DeliveryDeps) {
  /**
   * 新鲜窗口：源自己写了发布时间、而且已经很旧的，只入库不推送；
   * 没写发布时间的一律不当作过期（不然不会写时间的源永远推不出来）。
   */
  function isFresh(item: Item, now: Date): boolean {
    const days = deps.settings.get().freshnessWindowDays
    if (days <= 0) return true
    if (!item.sourcePublishedAt) return true
    const published = Date.parse(item.sourcePublishedAt)
    if (Number.isNaN(published)) return true
    return published >= now.getTime() - days * DAY_MS
  }

  /** 动作是分组级的；监听上没指定动作就跟随分组，指定了就只在列出的动作上生效 */
  function monitorIdsFor(action: Action): string[] {
    return deps.monitors
      .list()
      .filter(
        (monitor) =>
          monitor.enabled &&
          monitor.groupId === action.groupId &&
          (monitor.actionIds.length === 0 || monitor.actionIds.includes(action.id)),
      )
      .map((monitor) => monitor.id)
  }

  function startOfToday(now: Date): string {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start.toISOString()
  }

  /** 把「这个动作该收到的那批事件」挑出来 */
  function pickEvents(
    action: Action,
    trigger: DeliveryTrigger,
  ): { event: Event; itemIds: string[] }[] {
    const now = new Date()
    const alreadyDelivered = deps.deliveries.deliveredItemIds(action.id)
    const deliveredAnywhere =
      trigger === 'digest' && !action.includeDelivered
        ? deps.deliveries.anyDeliveredItemIds()
        : new Set<string>()
    const passed = deps.judgments.passItemIds(monitorIdsFor(action))

    const candidates: Item[] = []
    for (const discovery of deps.discoveries.list()) {
      if (discovery.groupId !== action.groupId) continue
      for (const item of deps.items.listByDiscovery(discovery.id)) {
        if (!passed.has(item.id)) continue
        if (alreadyDelivered.has(item.id)) continue
        if (deliveredAnywhere.has(item.id)) continue
        if (!isFresh(item, now)) continue
        candidates.push(item)
      }
    }
    if (candidates.length === 0) return []

    const eventIds = deps.events.eventIdsForItems(candidates.map((item) => item.id))
    const grouped = new Map<string, string[]>()
    for (const item of candidates) {
      const eventId = eventIds.get(item.id)
      if (!eventId) continue
      const bucket = grouped.get(eventId)
      if (bucket) bucket.push(item.id)
      else grouped.set(eventId, [item.id])
    }

    const sentEvents = deps.deliveries.sentEventIds(action.id)
    const picked: { event: Event; itemIds: string[] }[] = []
    for (const [eventId, itemIds] of grouped) {
      const event = deps.events.get(eventId)
      if (!event) continue
      if (event.status === 'archived') continue
      // 这个动作已经推过这件事：默认不再推，只有标成「有更新」时才补推一次
      if (sentEvents.has(event.id) && event.status !== 'updated') continue
      picked.push({ event, itemIds })
    }
    return picked
  }

  async function deliverForAction(
    actionId: string,
    trigger: DeliveryTrigger,
  ): Promise<DeliveryOutcome> {
    const empty = { actionId, ok: true, trigger, messageCount: 0, itemCount: 0 }
    const skip = (message: string): DeliveryOutcome => ({ ...empty, message })

    const action = deps.actions.get(actionId)
    if (!action) return { ...skip('动作不存在'), ok: false }
    if (!action.enabled) return skip('动作已停用')
    if (action.triggerType !== trigger) return skip('触发方式对不上')
    const group = deps.groups.get(action.groupId)
    if (!group?.enabled) return skip('分组已停用')
    const channel = deps.channels.get(action.channelId)
    if (!channel || !channel.enabled) return skip('通知渠道不可用')
    if (monitorIdsFor(action).length === 0) return skip('这个动作上没有启用的监听')

    const picked = pickEvents(action, trigger)
    if (picked.length === 0) return skip('这轮没有该推的命中')

    const settings = deps.settings.get()
    const limit = settings.dailyDeliveryLimit
    const sentToday = deps.deliveries.countSentSince(startOfToday(new Date()))
    let budget = limit > 0 ? limit - sentToday : Number.POSITIVE_INFINITY
    if (budget <= 0) return skip(`今天已经推到上限（${limit} 条），剩下的只入库不通知`)

    // 动作只存模板 id，正文在模板库里；没选就用内置默认模板
    const template = deps.templates.contentFor(action.templateId)
    const messages = picked.map(({ event, itemIds }) => ({
      event,
      itemIds,
      text: renderTemplate(template, {
        groupName: group.name,
        event,
        members: deps.events.listItems(event.id),
        eventCount: picked.length,
        language: settings.language,
        timezone: settings.timezone,
      }),
    }))

    // 动作内部合并：多条命中攒成一条消息；关掉就一条一条发
    const sends = action.mergeMessages ? [messages] : messages.map((message) => [message])
    const secret = deps.channels.getSecret(action.channelId)
    let messageCount = 0
    let itemCount = 0

    for (const batch of sends) {
      const first = batch[0]
      if (!first || budget <= 0) break
      const text = batch.map((message) => message.text).join('\n\n---\n\n')
      let error: string | null = null
      try {
        await deps.batcher.enqueue({
          channel,
          secret,
          text,
          title: first.event.title,
          url: first.event.url,
          sourceCount: first.event.sourceCount,
          eventCount: batch.length,
          hitAt: first.event.firstItemAt,
        })
      } catch (failure) {
        error = (failure as Error).message || '发送失败'
      }

      const delivery = deps.deliveries.create({
        actionId: action.id,
        channelId: channel.id,
        triggerType: trigger,
        eventIds: batch.map((message) => message.event.id),
        status: error ? 'failed' : 'sent',
        message: text,
        error,
      })
      if (error) {
        deps.log?.('warn', `投递失败：${action.name} — ${error}`)
        continue
      }

      const sentItemIds = batch.flatMap((message) => message.itemIds)
      deps.deliveries.markItemsDelivered(delivery.id, action.id, sentItemIds)
      for (const message of batch)
        deps.events.markDelivered(message.event.id, new Date().toISOString())
      budget -= 1
      messageCount += 1
      itemCount += sentItemIds.length
    }

    if (messageCount === 0) return skip('没发出去（发送失败）')
    return {
      ok: true,
      actionId,
      trigger,
      messageCount,
      itemCount,
      message: `发出 ${messageCount} 条消息，覆盖 ${itemCount} 条命中`,
    }
  }

  return {
    deliverForAction,

    /** 采集完顺手把「发现即发」的动作跑一遍 */
    async deliverInstantForGroup(groupId: string): Promise<DeliveryOutcome[]> {
      const actions = deps.actions
        .list()
        .filter((action) => action.groupId === groupId && action.triggerType === 'instant')
      // 并行跑：同一轮里发往同一个渠道的多个动作才能被合并成一次外发
      return Promise.all(actions.map((action) => deliverForAction(action.id, 'instant')))
    },

    /** 渠道连通性测试：真的发一条测试消息（有副作用，只能手动触发） */
    /** 读取会话：token 优先用界面上刚填的，否则用渠道里存着的 */
    async listTelegramChats(input: {
      channelId?: string
      token?: string
    }): Promise<TelegramChat[]> {
      const typed = input.token?.trim()
      let token = typed && typed.length > 0 ? typed : null
      if (!token && input.channelId) token = deps.channels.getSecret(input.channelId)
      if (!token)
        throw new DeliveryError(
          '没有可用的 bot token：填一个，或选一个已经存过 token 的 Telegram 渠道',
        )
      return deps.telegram.listChats(token)
    },

    async testChannel(channelId: string): Promise<ChannelTestResult> {
      const channel = deps.channels.get(channelId)
      if (!channel) return { ok: false, message: '渠道不存在', sentAt: null }
      const text =
        deps.settings.get().language === 'en'
          ? '[Kestrel] Test message: this channel is connected.'
          : '【Kestrel】测试消息：这个渠道已经连通。'
      try {
        await deps.sender.send({
          channel,
          secret: deps.channels.getSecret(channelId),
          text,
          title: 'Kestrel 测试',
          url: null,
          sourceCount: 0,
          eventCount: 0,
          hitAt: null,
        })
        return { ok: true, message: '测试消息已发出', sentAt: new Date().toISOString() }
      } catch (error) {
        return { ok: false, message: (error as Error).message || '测试消息发送失败', sentAt: null }
      }
    },
  }
}

export type DeliveryService = ReturnType<typeof createDeliveryService>
