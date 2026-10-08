import { describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { buildFingerprint } from '../src/modules/collection/fingerprint.ts'
import { normalizeUrl, titleSimilarity } from '../src/modules/events/similarity.ts'

import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'

interface SeedItem {
  title: string
  url?: string | null
  summary?: string
  publishedAt?: string
  discovery: 'A' | 'B'
}

function container(): { container: Container; cleanup: () => void } {
  const db = createTempDb()
  return { container: buildContainer(openTestDatabase(db.path)), cleanup: db.cleanup }
}

function seedGroup(
  c: Container,
  name = 'G',
): { groupId: string; discoveries: Record<'A' | 'B', string>; monitorId: string } {
  const group = c.groups.create({ name, description: '', enabled: true })
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
  // 事件只由「判定为留下」的条目组成：这一组配一个监听，下面 addItem 会给条目补判定
  const monitor = c.monitors.create({
    groupId: group.id,
    name: '监听',
    mode: 'algorithm',
    sensitivity: 'medium',
    matchMode: 'any',
    intentText: '',
    includeKeywords: ['新闻'],
    excludeKeywords: [],
    useGlobalExcludes: false,
    enabled: true,
    actionIds: [],
  })
  return { groupId: group.id, discoveries: { A: a.id, B: b.id }, monitorId: monitor.id }
}

function addItem(
  c: Container,
  discoveryId: string,
  item: SeedItem,
  seenAt: string,
  verdict: 'pass' | 'drop' | 'none' = 'pass',
): void {
  c.items.record(
    discoveryId,
    {
      title: item.title,
      url: item.url ?? null,
      summary: item.summary ?? '正文内容',
      sourcePublishedAt: item.publishedAt ?? seenAt,
      fingerprint: buildFingerprint({
        url: item.url ?? null,
        title: item.title,
        summary: item.summary ?? '正文内容',
      }),
    },
    seenAt,
  )
  if (verdict === 'none') return
  const groupId = c.discoveries.get(discoveryId)?.groupId ?? ''
  const monitorId = c.monitors.list().find((row) => row.groupId === groupId)?.id
  const created = c.items.listByDiscovery(discoveryId).find((row) => row.title === item.title)
  if (!monitorId || !created) return
  c.judgments.insert({
    itemId: created.id,
    monitorId,
    decision: verdict,
    band: verdict === 'pass' ? 'high' : 'low',
    score: verdict === 'pass' ? 90 : 0,
    matchedKeywords: [],
    layer: 'score',
    reasons: [],
    llmReason: null,
  })
}

const T0 = '2026-10-01T02:00:00.000Z'

describe('链接与标题的相似度', () => {
  it('归一化链接：追踪参数、末尾斜杠、参数顺序都不算不同', () => {
    const left = normalizeUrl('https://Example.com/post/1/?utm_source=weibo&b=2&a=1')
    const right = normalizeUrl('https://example.com/post/1?a=1&b=2')
    expect(left).toBe(right)
  })

  it('同一件事换个说法：相似度很高', () => {
    const score = titleSimilarity(
      '特斯拉宣布在上海建设新工厂',
      '特斯拉宣布在上海建设新工厂（附细节）',
    )
    expect(score).toBeGreaterThanOrEqual(0.8)
  })

  it('只是共用几个词的两件不同的事：相似度低，不能硬并', () => {
    const score = titleSimilarity('苹果发布新款 MacBook Pro', '苹果发布新款 iPhone 17')
    expect(score).toBeLessThan(0.6)
  })
})

describe('事件归并', () => {
  it('同一个链接（追踪参数不同）一定并成一个事件，来源数按来源数', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '同一条新闻', url: 'https://news.example.com/x?utm_source=a', discovery: 'A' },
      T0,
    )
    addItem(
      c,
      discoveries.B,
      { title: '同一条新闻', url: 'https://news.example.com/x?from=b', discovery: 'B' },
      T0,
    )

    await c.merger.mergePendingItems(discoveries.A)
    await c.merger.mergePendingItems(discoveries.B)

    const events = c.events.listByGroup(groupId)
    expect(events).toHaveLength(1)
    expect(events[0]?.sourceCount).toBe(2)
    expect(c.events.listItems(events[0]?.id ?? '').length).toBe(2)
    cleanup()
  })

  it('判定没通过的条目不进事件：判为丢弃的、以及压根没判过的都不算数', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '通过的新闻', url: 'https://a.example.com/pass', discovery: 'A' },
      T0,
      'pass',
    )
    addItem(
      c,
      discoveries.A,
      { title: '判为丢弃的新闻', url: 'https://a.example.com/drop', discovery: 'A' },
      T0,
      'drop',
    )
    addItem(
      c,
      discoveries.B,
      { title: '没判过的新闻', url: 'https://b.example.com/none', discovery: 'B' },
      T0,
      'none',
    )

    await c.merger.mergePendingItems(discoveries.A)
    await c.merger.mergePendingItems(discoveries.B)

    const events = c.events.listByGroup(groupId)
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('通过的新闻')
    // 原始条目还在（只是没被并进事件）
    expect(c.items.listByDiscovery(discoveries.A)).toHaveLength(2)
    cleanup()
  })

  it('链接不同但内容高度相似：保守并进同一个事件', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '特斯拉宣布在上海建设新工厂', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    addItem(
      c,
      discoveries.B,
      {
        title: '特斯拉宣布在上海建设新工厂（附细节）',
        url: 'https://b.example.com/9',
        discovery: 'B',
      },
      T0,
    )

    await c.merger.mergePendingItems(discoveries.A)
    await c.merger.mergePendingItems(discoveries.B)

    const events = c.events.listByGroup(groupId)
    expect(events).toHaveLength(1)
    expect(events[0]?.sourceCount).toBe(2)
    cleanup()
  })

  it('宁可漏并也不硬并：标题只共用几个词就分开显示', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '苹果发布新款 MacBook Pro', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    addItem(
      c,
      discoveries.B,
      { title: '苹果发布新款 iPhone 17', url: 'https://b.example.com/2', discovery: 'B' },
      T0,
    )

    await c.merger.mergePendingItems(discoveries.A)
    await c.merger.mergePendingItems(discoveries.B)

    expect(c.events.listByGroup(groupId)).toHaveLength(2)
    cleanup()
  })

  it('跨分组不归并：两个分组里同样的链接各建各的事件', async () => {
    const { container: c, cleanup } = container()
    const first = seedGroup(c, 'G1')
    const second = seedGroup(c, 'G2')
    const url = 'https://news.example.com/same'
    addItem(c, first.discoveries.A, { title: '同一条新闻', url, discovery: 'A' }, T0)
    addItem(c, second.discoveries.A, { title: '同一条新闻', url, discovery: 'A' }, T0)

    await c.merger.mergePendingItems(first.discoveries.A)
    await c.merger.mergePendingItems(second.discoveries.A)

    expect(c.events.listByGroup(first.groupId)).toHaveLength(1)
    expect(c.events.listByGroup(second.groupId)).toHaveLength(1)
    cleanup()
  })

  it('时间离得远（超过比较窗口）的相似内容不并', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      {
        title: '特斯拉宣布在上海建设新工厂',
        url: 'https://a.example.com/1',
        publishedAt: '2026-09-20T02:00:00.000Z',
        discovery: 'A',
      },
      '2026-09-20T02:00:00.000Z',
    )
    addItem(
      c,
      discoveries.B,
      {
        title: '特斯拉宣布在上海建设新工厂（附细节）',
        url: 'https://b.example.com/9',
        publishedAt: T0,
        discovery: 'B',
      },
      T0,
    )

    await c.merger.mergePendingItems(discoveries.A)
    await c.merger.mergePendingItems(discoveries.B)

    expect(c.events.listByGroup(groupId)).toHaveLength(2)
    cleanup()
  })

  it('归并不删原始条目：并起来的内容能展开看到全部来源', async () => {
    const { container: c, cleanup } = container()
    const { discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      {
        title: '同一条新闻：某公司发布新品',
        url: 'https://news.example.com/x?a=1',
        discovery: 'A',
      },
      T0,
    )
    addItem(
      c,
      discoveries.B,
      {
        title: '同一条新闻：某公司发布新品',
        url: 'https://news.example.com/x?b=2',
        discovery: 'B',
      },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)
    await c.merger.mergePendingItems(discoveries.B)

    const event = c.events.listByGroup(c.discoveries.get(discoveries.A)?.groupId ?? '')[0]
    const members = c.events.listItems(event?.id ?? '')
    expect(members).toHaveLength(2)
    expect(members.map((member) => member.discoveryName).sort()).toEqual(['源A', '源B'])
    expect(c.items.listByDiscovery(discoveries.A)).toHaveLength(1)
    expect(c.items.listByDiscovery(discoveries.B)).toHaveLength(1)
    cleanup()
  })

  it('同一个来源重复发相似内容：条目并进来，但来源数不涨', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '特斯拉宣布在上海建设新工厂', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)
    addItem(
      c,
      discoveries.A,
      {
        title: '特斯拉宣布在上海建设新工厂（二次转载）',
        url: 'https://a.example.com/2',
        discovery: 'A',
      },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)

    const events = c.events.listByGroup(groupId)
    expect(events).toHaveLength(1)
    expect(events[0]?.sourceCount).toBe(1)
    expect(events[0]?.itemCount).toBe(2)
    cleanup()
  })

  it('同一批条目合并两次不会多出事件（幂等）', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '一条新闻', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    const first = await c.merger.mergePendingItems(discoveries.A)
    const second = await c.merger.mergePendingItems(discoveries.A)

    expect(first.created).toBe(1)
    expect(second.created).toBe(0)
    expect(c.events.listByGroup(groupId)).toHaveLength(1)
    cleanup()
  })

  it('长期没有新条目的事件自动归档，归档后不再参与比较', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    c.settings.update({ eventArchiveDays: 14 })
    addItem(
      c,
      discoveries.A,
      {
        title: '特斯拉宣布在上海建设新工厂',
        url: 'https://a.example.com/1',
        publishedAt: '2026-09-01T02:00:00.000Z',
        discovery: 'A',
      },
      '2026-09-01T02:00:00.000Z',
    )
    await c.merger.mergePendingItems(discoveries.A)

    const archived = c.merger.archiveStale(new Date('2026-10-01T02:00:00.000Z'))
    expect(archived).toBe(1)
    expect(c.events.listByGroup(groupId)[0]?.status).toBe('archived')

    // 归档之后来了一条相似内容：不再并进去，另起一条
    addItem(
      c,
      discoveries.B,
      {
        title: '特斯拉宣布在上海建设新工厂（附细节）',
        url: 'https://b.example.com/9',
        discovery: 'B',
      },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.B)
    const active = c.events.listByGroup(groupId).filter((event) => event.status !== 'archived')
    expect(active).toHaveLength(1)
    cleanup()
  })
})

describe('进展信号（决定要不要再推一次）', () => {
  function deliveredEvent(c: Container, groupId: string): string {
    const event = c.events.listByGroup(groupId)[0]
    const id = event?.id ?? ''
    c.events.markDelivered(id, T0)
    return id
  }

  it('已投递的事件来了新来源、内容里带进展信号：标成「有更新」', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '某网盘宣布将停服', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)
    const eventId = deliveredEvent(c, groupId)

    addItem(
      c,
      discoveries.B,
      { title: '某网盘官方：停服时间已确定', url: 'https://a.example.com/1', discovery: 'B' },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.B)

    expect(c.events.get(eventId)?.status).toBe('updated')
    expect(c.events.get(eventId)?.sourceCount).toBe(2)
    cleanup()
  })

  it('同一来源重复转载：不算进展，状态还是已投递', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '某网盘宣布将停服', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)
    const eventId = deliveredEvent(c, groupId)

    addItem(
      c,
      discoveries.A,
      { title: '某网盘宣布将停服（转载）', url: 'https://a.example.com/2', discovery: 'A' },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)

    expect(c.events.get(eventId)?.status).toBe('delivered')
    cleanup()
  })

  it('新来源但内容里没有进展信号：不算进展', async () => {
    const { container: c, cleanup } = container()
    const { groupId, discoveries } = seedGroup(c)
    addItem(
      c,
      discoveries.A,
      { title: '特斯拉宣布在上海建设新工厂', url: 'https://a.example.com/1', discovery: 'A' },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.A)
    const eventId = deliveredEvent(c, groupId)

    addItem(
      c,
      discoveries.B,
      {
        title: '特斯拉宣布在上海建设新工厂（附细节）',
        url: 'https://b.example.com/2',
        discovery: 'B',
      },
      T0,
    )
    await c.merger.mergePendingItems(discoveries.B)

    expect(c.events.get(eventId)?.status).toBe('delivered')
    cleanup()
  })
})
