import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'

let server: FeedServer
let container: Container
let cleanup: () => void

beforeEach(async () => {
  const db = createTempDb()
  cleanup = db.cleanup
  container = buildContainer(openTestDatabase(db.path))
  server = await startFeedServer({
    '/feed': { body: RSS_TWO_ITEMS },
    '/rsshub-ok': { body: '<html>RSSHub</html>', contentType: 'text/html' },
  })
})

afterEach(async () => {
  await server.stop()
  cleanup()
})

function seed(): string {
  const group = container.groups.create({ name: '分组', description: '', enabled: true })
  return group.id
}

describe('仪表盘汇总', () => {
  it('空库：数量全 0，比例是 null，RSSHub 走默认地址但探测不通', async () => {
    const overview = await container.stats.overview()
    expect(overview.counts.discoveries).toEqual({ enabled: 0, total: 0 })
    expect(overview.counts.monitors).toEqual({ enabled: 0, total: 0 })
    expect(overview.counts.actions).toEqual({ enabled: 0, total: 0 })
    expect(overview.counts.channels).toEqual({ enabled: 0, total: 0 })
    expect(overview.events.today).toBe(0)
    expect(overview.delivery).toEqual({ sent: 0, failed: 0, rate: null })
    expect(overview.collection.rounds).toBe(0)
    expect(overview.collection.rate).toBeNull()
    expect(overview.collection.windowDays).toBe(7)
    // 实例地址有后端默认值（本机 1200），所以默认就算「配了」；探不探得通取决于跑测试的机器，不在这断
    expect(overview.rsshub.configured).toBe(true)
  })

  it('数量卡数的是启用数 / 总数', async () => {
    const groupId = seed()
    container.discoveries.create({
      groupId,
      name: 'A',
      kind: 'rss',
      target: `${server.baseUrl}/feed`,
      cronExpression: '0 * * * *',
      enabled: true,
    })
    container.discoveries.create({
      groupId,
      name: 'B',
      kind: 'rss',
      target: `${server.baseUrl}/feed`,
      cronExpression: '0 * * * *',
      enabled: false,
    })
    container.monitors.create({
      groupId,
      name: '监听',
      mode: 'follow_global',
      sensitivity: 'medium',
      matchMode: 'any',
      intentText: '',
      includeKeywords: [],
      excludeKeywords: [],
      useGlobalExcludes: true,
      enabled: false,
      actionIds: [],
    })
    const overview = await container.stats.overview()
    expect(overview.counts.discoveries).toEqual({ enabled: 1, total: 2 })
    expect(overview.counts.monitors).toEqual({ enabled: 0, total: 1 })
    expect(overview.counts.channels).toEqual({ enabled: 0, total: 0 })
  })

  it('采集成功率按轮算：成功一轮、失败一轮 → 0.5，失败源数 1', async () => {
    const groupId = seed()
    const good = container.discoveries.create({
      groupId,
      name: '好源',
      kind: 'rss',
      target: `${server.baseUrl}/feed`,
      cronExpression: '0 * * * *',
      enabled: true,
    })
    const bad = container.discoveries.create({
      groupId,
      name: '坏源',
      kind: 'rss',
      target: `${server.baseUrl}/not-found`,
      cronExpression: '0 * * * *',
      enabled: true,
    })

    await container.collector.collectDiscovery(good.id)
    await container.collector.collectDiscovery(bad.id)

    const overview = await container.stats.overview()
    expect(overview.collection.rounds).toBe(2)
    expect(overview.collection.okRounds).toBe(1)
    expect(overview.collection.rate).toBe(0.5)
    expect(overview.collection.failingSources).toBe(1)
  })

  it('今日事件按今天新建的算', async () => {
    const groupId = seed()
    container.events.create({
      groupId,
      title: '事件',
      url: null,
      urlKey: null,
      itemAt: new Date().toISOString(),
    })
    const overview = await container.stats.overview()
    expect(overview.events.today).toBe(1)
  })

  it('RSSHub 状态：配了地址就探一次，20 秒内同一个地址不再真探', async () => {
    container.settings.update({ rsshubBaseUrl: `${server.baseUrl}/rsshub-ok` })
    const first = await container.stats.overview()
    expect(first.rsshub).toMatchObject({
      configured: true,
      ok: true,
      baseUrl: `${server.baseUrl}/rsshub-ok`,
    })
    expect(first.rsshub.checkedAt).toBeTruthy()

    const before = server.requests.length
    const second = await container.stats.overview()
    expect(server.requests.length).toBe(before)
    expect(second.rsshub.checkedAt).toBe(first.rsshub.checkedAt)
  })
})

describe('RSSHub 留空使用默认地址', () => {
  it('留空时仍探默认实例，不把默认地址写进设置', async () => {
    container.settings.update({ rsshubBaseUrl: '' })
    const overview = await container.stats.overview()
    expect(container.settings.get().rsshubBaseUrl).toBe('')
    expect(overview.rsshub).toMatchObject({
      configured: true,
      baseUrl: 'http://localhost:1200',
    })
  })

  it('保存空地址后设置仍为空，自定义地址仍优先', () => {
    container.settings.update({ rsshubBaseUrl: '' })
    expect(container.settings.get().rsshubBaseUrl).toBe('')
    container.settings.update({ rsshubBaseUrl: 'http://rsshub:1200' })
    expect(container.settings.get().rsshubBaseUrl).toBe('http://rsshub:1200')
  })
})

describe('推送超时可配', () => {
  it('设置里默认 15 秒，最小 5 秒', async () => {
    expect(container.settings.get().deliveryTimeoutSeconds).toBe(15)
    container.settings.update({ deliveryTimeoutSeconds: 30 })
    expect(container.settings.get().deliveryTimeoutSeconds).toBe(30)
  })
})
