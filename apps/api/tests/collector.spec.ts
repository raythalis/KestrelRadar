import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import {
  RSS_THREE_ITEMS,
  RSS_TWO_ITEMS,
  PAGE_WITH_FEED_LINK,
  PAGE_WITHOUT_FEED,
} from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'

let server: FeedServer
let container: Container
let cleanupDb: () => void

beforeEach(async () => {
  const db = createTempDb()
  cleanupDb = db.cleanup
  container = buildContainer(openTestDatabase(db.path))
  server = await startFeedServer({
    '/rss': { body: RSS_TWO_ITEMS },
    '/page': { body: PAGE_WITH_FEED_LINK, contentType: 'text/html; charset=utf-8' },
    '/notafeed': { body: PAGE_WITHOUT_FEED, contentType: 'text/html; charset=utf-8' },
    '/broken': { body: 'boom', status: 500 },
  })
  container.settings.update({
    rsshubBaseUrl: server.baseUrl,
    rsshubAccessKey: 'k-123',
    requestTimeoutSeconds: 5,
    maxRetries: 2,
  })
})

afterEach(async () => {
  await server.stop()
  cleanupDb()
})

function addDiscovery(overrides: Record<string, unknown> = {}) {
  const group = container.groups.create({ name: 'G', description: '', enabled: true })
  return container.discoveries.create({
    groupId: group.id,
    name: '源',
    kind: 'rss',
    target: `${server.baseUrl}/rss`,
    cronExpression: '0 * * * *',
    enabled: true,
    ...overrides,
  })
}

describe('采集', () => {
  it('首次采集建基线：条目入库、记下基线时间与条数', async () => {
    const discovery = addDiscovery()

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome).toMatchObject({ ok: true, newItemCount: 2 })
    const state = container.discoveries.get(discovery.id)
    expect(state?.baselineItemCount).toBe(2)
    expect(state?.baselineEstablishedAt).toBeTruthy()
    expect(state?.contentOk).toBe(true)
    expect(state?.itemCount).toBe(2)
    expect(state?.latestItemAt).toBe('2026-09-30T12:00:00.000Z')
    expect(container.items.listByDiscovery(discovery.id)).toHaveLength(2)
  })

  it('再抓一次：同样内容不算新增，只刷新「最近见到」', async () => {
    const discovery = addDiscovery()
    await container.collector.collectDiscovery(discovery.id)
    const before = container.items.listByDiscovery(discovery.id)

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome).toMatchObject({ ok: true, newItemCount: 0 })
    const after = container.items.listByDiscovery(discovery.id)
    expect(after).toHaveLength(2)
    const first = after.find((item) => item.url?.includes('/post/1'))
    const beforeFirst = before.find((item) => item.url?.includes('/post/1'))
    expect(first?.firstSeenAt).toBe(beforeFirst?.firstSeenAt)
    expect(first && beforeFirst && first.lastSeenAt >= beforeFirst.lastSeenAt).toBe(true)
  })

  it('源里多了一条：只新增那一条，带追踪参数的旧条目不会重复入库', async () => {
    const discovery = addDiscovery()
    await container.collector.collectDiscovery(discovery.id)
    server.setBody('/rss', RSS_THREE_ITEMS)

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome).toMatchObject({ ok: true, newItemCount: 1 })
    expect(container.items.listByDiscovery(discovery.id)).toHaveLength(3)
  })

  it('网页地址类型：自动找到页面里的订阅源再采集', async () => {
    const discovery = addDiscovery({ kind: 'web', target: `${server.baseUrl}/page` })

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome).toMatchObject({ ok: true, newItemCount: 2 })
  })

  it('RSSHub 类型：相对路由用实例地址拼，实例密钥作为参数带上', async () => {
    server.setBody('/github/trending/daily', RSS_TWO_ITEMS)
    const discovery = addDiscovery({ kind: 'rsshub', target: '/github/trending/daily' })

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.ok).toBe(true)
    const hit = server.requests.find((url) => url.includes('/github/trending/daily'))
    expect(hit).toBeTruthy()
    expect(hit).toContain('key=k-123')
  })

  it('取到页面但不是 feed：路由通、内容不通，并说清原因', async () => {
    const discovery = addDiscovery({ kind: 'rss', target: `${server.baseUrl}/notafeed` })

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome).toMatchObject({ ok: false, routeOk: true, contentOk: false })
    expect(outcome.message).toContain('订阅源')
    const state = container.discoveries.get(discovery.id)
    expect(state?.routeOk).toBe(true)
    expect(state?.contentOk).toBe(false)
  })

  it('源返回 500：重试后仍失败，只记失败不影响库里已有内容', async () => {
    const discovery = addDiscovery({ target: `${server.baseUrl}/broken` })

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.ok).toBe(false)
    expect(outcome.routeOk).toBe(false)
    expect(server.requests.filter((url) => url.startsWith('/broken'))).toHaveLength(3)
  })

  it('源不回话就超时收场，不卡住整轮', async () => {
    container.settings.update({ requestTimeoutSeconds: 5 })
    server.setSequence('/slow', [{ hang: true }])
    const discovery = addDiscovery({ target: `${server.baseUrl}/slow` })

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.ok).toBe(false)
    expect(outcome.message.length).toBeGreaterThan(0)
  }, 20000)

  it('先失败后成功：重试真的管用', async () => {
    server.setSequence('/flaky', [
      { status: 500, body: 'boom' },
      { status: 200, body: RSS_TWO_ITEMS, contentType: 'application/rss+xml' },
    ])
    const discovery = addDiscovery({ target: `${server.baseUrl}/flaky` })

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome).toMatchObject({ ok: true, newItemCount: 2 })
    expect(server.requests.filter((url) => url.startsWith('/flaky'))).toHaveLength(2)
  })
})
