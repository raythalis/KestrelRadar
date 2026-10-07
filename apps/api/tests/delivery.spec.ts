import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { createChannelBatcher } from '../src/modules/delivery/batch.ts'
import {
  createWebhookSender,
  type DeliverableMessage,
  type DeliverySender,
} from '../src/modules/delivery/sender.ts'
import { buildFingerprint } from '../src/modules/collection/fingerprint.ts'
import { openDatabase } from '../src/db/index.ts'
import { createTempDb } from './helpers/temp-db.ts'

const T0 = '2026-10-01T02:00:00.000Z'

interface SentMessage {
  channelId: string
  text: string
}

function recordingSender(): { sent: SentMessage[]; sender: DeliverySender } {
  const sent: SentMessage[] = []
  return {
    sent,
    sender: {
      async send(message: DeliverableMessage) {
        sent.push({ channelId: message.channel.id, text: message.text })
      },
    },
  }
}

let cleanup: () => void
let container: Container
let sent: SentMessage[]

function setup(): void {
  const db = createTempDb()
  cleanup = db.cleanup
  const recorder = recordingSender()
  sent = recorder.sent
  container = buildContainer(openDatabase(db.path), {
    sender: recorder.sender,
    // 测试里不想等 3 秒的合并窗口
    batcher: createChannelBatcher(recorder.sender, 5),
  })
}

beforeEach(setup)
afterEach(() => cleanup())

interface Fixture {
  groupId: string
  discoveryA: string
  discoveryB: string
  monitorId: string
  channelId: string
  actionId: string
}

function seed(
  c: Container,
  options: {
    trigger?: 'instant' | 'digest'
    includeDelivered?: boolean
    mergeMessages?: boolean
    templateId?: string | null
    keywords?: string[]
    cron?: string
  } = {},
): Fixture {
  const group = c.groups.create({ name: 'G', description: '', enabled: true })
  const channel = c.channels.create({
    name: 'Hook',
    type: 'webhook',
    config: { url: 'https://hooks.example.com/abc' },
    enabled: true,
  })
  const a = c.discoveries.create({
    groupId: group.id,
    name: '源A',
    kind: 'rss',
    target: 'https://a.example.com/feed',
    cronExpression: '0 * * * *',
    enabled: true,
  })
  const b = c.discoveries.create({
    groupId: group.id,
    name: '源B',
    kind: 'rss',
    target: 'https://b.example.com/feed',
    cronExpression: '0 * * * *',
    enabled: true,
  })
  const monitor = c.monitors.create({
    groupId: group.id,
    name: '监听',
    mode: 'algorithm',
    sensitivity: 'medium',
    matchMode: 'any',
    intentText: '',
    includeKeywords: options.keywords ?? ['新闻'],
    excludeKeywords: [],
    useGlobalExcludes: false,
    enabled: true,
    actionIds: [],
  })
  const action = c.actions.create({
    groupId: group.id,
    name: '动作',
    triggerType: options.trigger ?? 'instant',
    channelId: channel.id,
    cronExpression: options.cron ?? (options.trigger === 'digest' ? '0 9 * * *' : null),
    templateId: options.templateId ?? null,
    includeDelivered: options.includeDelivered ?? false,
    mergeMessages: options.mergeMessages ?? true,
    enabled: true,
  })
  return {
    groupId: group.id,
    discoveryA: a.id,
    discoveryB: b.id,
    monitorId: monitor.id,
    channelId: channel.id,
    actionId: action.id,
  }
}

function addItem(
  c: Container,
  discoveryId: string,
  input: { title: string; url?: string; summary?: string; publishedAt?: string },
  seenAt = T0,
): void {
  c.items.record(
    discoveryId,
    {
      title: input.title,
      url: input.url ?? null,
      summary: input.summary ?? '正文内容',
      sourcePublishedAt: input.publishedAt ?? seenAt,
      fingerprint: buildFingerprint({
        url: input.url ?? null,
        title: input.title,
        summary: input.summary ?? '正文内容',
      }),
    },
    seenAt,
  )
}

/** 走一遍真实链路：判定 → 归并 → 发现即发 */
async function runPipeline(c: Container, discoveryId: string): Promise<void> {
  await c.judge.judgePendingItems(discoveryId)
  await c.merger.mergePendingItems(discoveryId)
  const groupId = c.discoveries.get(discoveryId)?.groupId ?? ''
  await c.delivery.deliverInstantForGroup(groupId)
}

describe('投递失败：原始说法留在异常里当副信息', () => {
  it('Webhook 返回 500：异常里留下 HTTP 500', async () => {
    const db = createTempDb()
    const failing = createWebhookSender({
      fetchImpl: (async () => new Response('boom', { status: 500 })) as unknown as typeof fetch,
      timeoutSeconds: 1,
    })
    const c = buildContainer(openDatabase(db.path), {
      sender: failing,
      batcher: createChannelBatcher(failing, 5),
    })
    try {
      const fx = seed(c)
      addItem(c, fx.discoveryA, {
        title: '一条新闻：某公司发布新品',
        url: 'https://a.example.com/1',
      })

      await runPipeline(c, fx.discoveryA)

      const incident = c.incidents.listAll().find((item) => item.kind === 'delivery')
      expect(incident?.code).toBe('delivery.webhookStatus')
      expect(incident?.detail).toBe('HTTP 500')
    } finally {
      db.cleanup()
    }
  })
})

describe('即时投递（发现即发）', () => {
  it('命中就发一条消息，里面带事件标题、来源数与链接', async () => {
    const c = container
    const fx = seed(c)
    addItem(c, fx.discoveryA, { title: '一条新闻：某公司发布新品', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(1)
    expect(sent[0]?.text).toContain('某公司发布新品')
    expect(sent[0]?.text).toContain('来源 1 个')
    expect(sent[0]?.text).toContain('https://a.example.com/1')

    // 留痕：投递记录 + 内容 × 动作 的底账 + 事件状态
    const deliveries = c.deliveries.listByAction(fx.actionId)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.status).toBe('sent')
    expect(deliveries[0]?.triggerType).toBe('instant')
    const event = c.events.listByGroup(fx.groupId)[0]
    expect(event?.status).toBe('delivered')
  })

  it('同一条内容不会投第二次（幂等）', async () => {
    const c = container
    const fx = seed(c)
    addItem(c, fx.discoveryA, { title: '一条新闻：某公司发布新品', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(1)
    expect(c.deliveries.listByAction(fx.actionId)).toHaveLength(1)
  })

  it('没命中的内容不推，但照样留在库里', async () => {
    const c = container
    const fx = seed(c, { keywords: ['量子计算'] })
    addItem(c, fx.discoveryA, { title: '一条新闻：某公司发布新品', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(0)
    expect(c.items.listByDiscovery(fx.discoveryA)).toHaveLength(1)
  })

  it('停用的动作不推', async () => {
    const c = container
    const fx = seed(c)
    c.actions.update(fx.actionId, { enabled: false })
    addItem(c, fx.discoveryA, { title: '一条新闻：某公司发布新品', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(0)
  })
})

describe('新鲜窗口与每日上限', () => {
  it('源自己写了很旧的发布时间：只入库不推送', async () => {
    const c = container
    const fx = seed(c)
    c.settings.update({ freshnessWindowDays: 7 })
    addItem(
      c,
      fx.discoveryA,
      {
        title: '一条新闻：某公司发布新品',
        url: 'https://a.example.com/1',
        publishedAt: '2026-09-01T02:00:00.000Z',
      },
      '2026-10-01T02:00:00.000Z',
    )
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(0)
    expect(c.items.listByDiscovery(fx.discoveryA)).toHaveLength(1)
  })

  it('没写发布时间的旧内容不会被当成过期', async () => {
    const c = container
    const fx = seed(c)
    addItem(c, fx.discoveryA, { title: '一条新闻：某公司发布新品', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)
    expect(sent).toHaveLength(1)
  })

  it('每日上限：到上限之后只入库不通知', async () => {
    const c = container
    const fx = seed(c)
    c.settings.update({ dailyDeliveryLimit: 1 })
    addItem(c, fx.discoveryA, { title: '一条新闻：某事发生了', url: 'https://a.example.com/1' })
    addItem(c, fx.discoveryB, { title: '一条新闻：另一件事', url: 'https://b.example.com/2' })
    await runPipeline(c, fx.discoveryA)
    await runPipeline(c, fx.discoveryB)

    expect(sent).toHaveLength(1)
    // 第二条照样在库里、也有判定记录，只是没推
    expect(c.items.listByDiscovery(fx.discoveryB)).toHaveLength(1)
    expect(c.judgments.listByMonitor(fx.monitorId)).toHaveLength(2)
  })
})

describe('合并发送', () => {
  it('动作内部合并：两条命中合成一条消息', async () => {
    const c = container
    const fx = seed(c)
    // 同一轮采集里的两条命中（各自是一个事件）
    addItem(c, fx.discoveryA, { title: '一条新闻：某事发生了', url: 'https://a.example.com/1' })
    addItem(c, fx.discoveryA, { title: '一条新闻：另一件事', url: 'https://a.example.com/2' })
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(1)
    expect(sent[0]?.text).toContain('某事发生了')
    expect(sent[0]?.text).toContain('另一件事')
  })

  it('关掉合并：一条命中一条消息', async () => {
    const c = container
    const fx = seed(c, { mergeMessages: false })
    addItem(c, fx.discoveryA, { title: '一条新闻：某事发生了', url: 'https://a.example.com/1' })
    addItem(c, fx.discoveryA, { title: '一条新闻：另一件事', url: 'https://a.example.com/2' })
    await runPipeline(c, fx.discoveryA)

    expect(sent).toHaveLength(2)
  })

  it('同一轮里发往同一个渠道的多个动作：合并成一次外发', async () => {
    const c = container
    const fx = seed(c)
    c.actions.create({
      groupId: fx.groupId,
      name: '动作2',
      triggerType: 'instant',
      channelId: fx.channelId,
      cronExpression: null,
      templateId: null,
      includeDelivered: false,
      mergeMessages: true,
      enabled: true,
    })
    addItem(c, fx.discoveryA, { title: '一条新闻：某事发生了', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)

    // 两个动作都排进了同一个渠道的窗口，最后只发一次
    expect(sent).toHaveLength(1)
    expect(c.deliveries.listByAction(fx.actionId)).toHaveLength(1)
  })
})

describe('已投递事件与「有更新」', () => {
  it('新来源再提同一件事：默认不再推', async () => {
    const c = container
    const fx = seed(c)
    addItem(c, fx.discoveryA, {
      title: '一条新闻：某网盘宣布将停服',
      url: 'https://a.example.com/1',
    })
    await runPipeline(c, fx.discoveryA)
    expect(sent).toHaveLength(1)

    // 另一个来源转了同一件事：并进同一个事件，但不补推
    addItem(c, fx.discoveryB, {
      title: '一条新闻：某网盘宣布将停服',
      url: 'https://a.example.com/1',
    })
    await runPipeline(c, fx.discoveryB)

    expect(sent).toHaveLength(1)
    expect(c.events.listByGroup(fx.groupId)[0]?.sourceCount).toBe(2)
  })

  it('出现明确进展信号时补推一次，消息里标「有更新」', async () => {
    const c = container
    const fx = seed(c)
    addItem(c, fx.discoveryA, {
      title: '一条新闻：某网盘宣布将停服',
      url: 'https://a.example.com/1',
    })
    await runPipeline(c, fx.discoveryA)

    // 同一个链接上出现了之前没提过的进展信号「已确定」
    addItem(c, fx.discoveryB, {
      title: '一条新闻：某网盘官方：停服时间已确定',
      url: 'https://a.example.com/1',
    })
    await runPipeline(c, fx.discoveryB)

    expect(sent).toHaveLength(2)
    expect(sent[1]?.text).toContain('有更新')
    expect(c.events.listByGroup(fx.groupId)[0]?.status).toBe('delivered')
  })
})

describe('模板', () => {
  it('动作选了自定义模板就按它渲染', async () => {
    const c = container
    const fx = seed(c)
    const template = c.templates.create({
      name: '简短版',
      content: '标题={{title}}｜来源={{sourceCount}}',
    })
    c.actions.update(fx.actionId, { templateId: template.id })
    addItem(c, fx.discoveryA, { title: '一条新闻：某事发生了', url: 'https://a.example.com/1' })
    await runPipeline(c, fx.discoveryA)

    expect(sent[0]?.text).toBe('标题=一条新闻：某事发生了｜来源=1')
  })
})

describe('汇总（每天定时）', () => {
  it('汇总只发还没在这个动作上投过的命中', async () => {
    const c = container
    const fx = seed(c, { trigger: 'digest' })
    addItem(c, fx.discoveryA, { title: '一条新闻：某事发生了', url: 'https://a.example.com/1' })
    await c.judge.judgePendingItems(fx.discoveryA)
    await c.merger.mergePendingItems(fx.discoveryA)

    const first = await c.delivery.deliverForAction(fx.actionId, 'digest')
    expect(first.messageCount).toBe(1)
    expect(sent).toHaveLength(1)

    const second = await c.delivery.deliverForAction(fx.actionId, 'digest')
    expect(second.messageCount).toBe(0)
    expect(sent).toHaveLength(1)
  })

  it('默认不含已经即时推送过的内容，勾上就含', async () => {
    const c = container
    const instant = seed(c)
    addItem(c, instant.discoveryA, {
      title: '一条新闻：某事发生了',
      url: 'https://a.example.com/1',
    })
    await runPipeline(c, instant.discoveryA)
    expect(sent).toHaveLength(1)

    const digest = c.actions.create({
      groupId: instant.groupId,
      name: '汇总',
      triggerType: 'digest',
      channelId: instant.channelId,
      cronExpression: '0 9 * * *',
      templateId: null,
      includeDelivered: false,
      mergeMessages: true,
      enabled: true,
    })
    const without = await c.delivery.deliverForAction(digest.id, 'digest')
    expect(without.messageCount).toBe(0)

    c.actions.update(digest.id, { includeDelivered: true })
    const withIt = await c.delivery.deliverForAction(digest.id, 'digest')
    expect(withIt.messageCount).toBe(1)
  })
})
