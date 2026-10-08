import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'

let server: FeedServer
let container: Container
let cleanup: () => void

beforeEach(async () => {
  const db = createTempDb()
  cleanup = db.cleanup
  container = buildContainer(openTestDatabase(db.path))
  server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
})

afterEach(async () => {
  await server.stop()
  cleanup()
})

function makeGroup() {
  return container.groups.create({ name: 'G', description: '', enabled: true })
}

function makeDiscovery(groupId: string, target = `${server.baseUrl}/rss`) {
  return container.discoveries.create({
    groupId,
    name: '源',
    kind: 'rss',
    target,
    cronExpression: '0 * * * *',
    enabled: true,
  })
}

const round = (ok: number, total: number) => Math.round((ok / total) * 1000) / 1000

describe('卡片背面的按对象汇总', () => {
  it('空库：三张表都是空的，窗口天数跟仪表盘一致', async () => {
    const stats = await container.stats.cardStats()

    expect(stats.windowDays).toBe(7)
    expect(stats.discoveries).toEqual({})
    expect(stats.monitors).toEqual({})
    expect(stats.actions).toEqual({})
  })

  it('发现卡：计数是抓到的条数，成功率按 route_ok，daily 最后一天是今天', async () => {
    const group = makeGroup()
    const discovery = makeDiscovery(group.id)

    await container.collector.collectDiscovery(discovery.id)

    const stat = (await container.stats.cardStats()).discoveries[discovery.id]!
    expect(stat.total).toBe(2)
    expect(stat.rate).toBe(1)
    expect(stat.daily).toHaveLength(7)
    expect(stat.daily.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0])
    expect(stat.daily[6]).toBe(2)
  })

  it('发现卡：连不上时成功率是 0，抓到的条数为 0', async () => {
    const group = makeGroup()
    const discovery = makeDiscovery(group.id, 'http://127.0.0.1:1/rss')

    await container.collector.collectDiscovery(discovery.id)

    const stat = (await container.stats.cardStats()).discoveries[discovery.id]!
    expect(stat.rate).toBe(0)
    expect(stat.total).toBe(0)
  })

  it('监听卡：筛选率是命中占比，计数与 daily 都是命中条数', async () => {
    const group = makeGroup()
    const discovery = makeDiscovery(group.id)
    const monitor = container.monitors.create({
      groupId: group.id,
      name: '监听',
      mode: 'algorithm',
      sensitivity: 'medium',
      matchMode: 'any',
      intentText: '',
      includeKeywords: ['文章'],
      excludeKeywords: [],
      useGlobalExcludes: false,
      enabled: true,
      actionIds: [],
    })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    const passed = judgments.filter((row) => row.decision === 'pass').length
    const stat = (await container.stats.cardStats()).monitors[monitor.id]!
    expect(judgments.length).toBeGreaterThan(0)
    expect(stat.total).toBe(passed)
    expect(stat.rate).toBe(round(passed, judgments.length))
    expect(stat.daily[6]).toBe(passed)
    expect(stat.daily.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('动作卡：计数是投递次数，成功率按发送成功算', async () => {
    const group = makeGroup()
    const channel = container.channels.create({
      name: 'Hook',
      type: 'webhook',
      config: { url: 'https://hooks.example.com/abc' },
      enabled: true,
    })
    const action = container.actions.create({
      groupId: group.id,
      name: '动作',
      triggerType: 'instant',
      channelId: channel.id,
      cronExpression: null,
      templateId: null,
      includeDelivered: false,
      mergeMessages: true,
      enabled: true,
    })

    container.deliveries.create({
      actionId: action.id,
      channelId: channel.id,
      triggerType: 'instant',
      eventIds: ['e1'],
      status: 'sent',
      message: 'ok',
      error: null,
    })
    container.deliveries.create({
      actionId: action.id,
      channelId: channel.id,
      triggerType: 'instant',
      eventIds: ['e2'],
      status: 'failed',
      message: '失败',
      error: 'boom',
    })

    const stat = (await container.stats.cardStats()).actions[action.id]!
    expect(stat.total).toBe(2)
    expect(stat.rate).toBe(0.5)
    expect(stat.daily[6]).toBe(2)
  })

  it('窗口内没有记录的对象不出现在结果里（不编 0）', async () => {
    const group = makeGroup()
    const discovery = makeDiscovery(group.id)
    container.monitors.create({
      groupId: group.id,
      name: '没判过的监听',
      mode: 'algorithm',
      sensitivity: 'medium',
      matchMode: 'any',
      intentText: '',
      includeKeywords: [],
      excludeKeywords: [],
      useGlobalExcludes: false,
      enabled: true,
      actionIds: [],
    })

    const stats = await container.stats.cardStats()
    expect(Object.keys(stats.discoveries)).toEqual([])
    expect(Object.keys(stats.monitors)).toEqual([])
    expect(discovery.id).toBeTruthy()
  })
})
