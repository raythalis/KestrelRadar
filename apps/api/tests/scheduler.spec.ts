import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import { createDiscoveryRepo } from '../src/modules/discoveries/discovery.repo.ts'
import { isValidCron, nextRunAt } from '../src/modules/collection/scheduler.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'

let server: FeedServer
let container: Container
let connection: ReturnType<typeof openTestDatabase>
let cleanupDb: () => void

beforeEach(async () => {
  const db = createTempDb()
  cleanupDb = db.cleanup
  connection = openTestDatabase(db.path)
  container = buildContainer(connection)
  server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
  container.settings.update({
    rsshubBaseUrl: server.baseUrl,
    requestTimeoutSeconds: 5,
    maxRetries: 1,
    concurrency: 5,
  })
})

afterEach(async () => {
  await container.scheduler.stop()
  await server.stop()
  cleanupDb()
})

function addDiscovery(overrides: Record<string, unknown> = {}, groupEnabled = true) {
  const group = container.groups.create({ name: 'G', description: '', enabled: groupEnabled })
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

/** 秒级 cron 只有调度器认（写接口只收 5 段），这几条用例直接进库，免得为等一分钟把测试拖垮 */
function addFastDiscovery(overrides: Record<string, unknown> = {}) {
  const group = container.groups.create({ name: 'G', description: '', enabled: true })
  return createDiscoveryRepo(connection).create({
    groupId: group.id,
    name: '快源',
    kind: 'rss',
    target: `${server.baseUrl}/rss`,
    cronExpression: '* * * * * *',
    enabled: true,
    ...overrides,
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('定时表达式', () => {
  it('按 cron 算下一次触发时间', () => {
    const from = new Date('2026-10-01T04:20:00.000Z')
    // 本机是东八区：04:20Z = 12:20 本地，下一次整点是 13:00 本地 = 05:00Z
    expect(nextRunAt('0 * * * *', from)?.toISOString()).toBe('2026-10-01T05:00:00.000Z')
    expect(nextRunAt('*/5 * * * *', from)?.toISOString()).toBe('2026-10-01T04:25:00.000Z')
  })

  it('不合法的表达式认得出来', () => {
    expect(isValidCron('0 * * * *')).toBe(true)
    expect(isValidCron('不是 cron')).toBe(false)
    expect(isValidCron('99 99 * * *')).toBe(false)
  })
})

describe('调度：每个发现一个 cron 任务', () => {
  it('启用就注册任务，卡片上能读到下一次采集时间', () => {
    const discovery = addDiscovery()

    container.scheduler.sync()

    const next = container.scheduler.nextRunAt(discovery.id)
    expect(next).toBeTruthy()
    expect(container.discoveries.get(discovery.id)?.nextRunAt).toBe(next)
  })

  it('停用的发现、以及所在分组停用的发现都不安排任务', () => {
    const off = addDiscovery({ name: '停用', enabled: false })
    const inOffGroup = addDiscovery({ name: '分组停用' }, false)

    container.scheduler.sync()

    expect(container.scheduler.nextRunAt(off.id)).toBeNull()
    expect(container.scheduler.nextRunAt(inOffGroup.id)).toBeNull()
  })

  it('改了频率：下一次触发时间跟着变', () => {
    const discovery = addDiscovery({ cronExpression: '0 4 * * *' })
    container.scheduler.sync()
    const before = container.scheduler.nextRunAt(discovery.id)
    expect(new Date(before as string).getHours()).toBe(4)

    container.discoveries.update(discovery.id, { cronExpression: '30 6 * * *' })
    container.scheduler.sync()

    const after = container.scheduler.nextRunAt(discovery.id)
    expect(after).not.toBe(before)
    expect(new Date(after as string).getHours()).toBe(6)
    expect(new Date(after as string).getMinutes()).toBe(30)
  })

  it('删掉发现，任务也跟着消失', () => {
    const discovery = addDiscovery()
    container.scheduler.sync()
    expect(container.scheduler.nextRunAt(discovery.id)).toBeTruthy()

    container.discoveries.remove(discovery.id)
    container.scheduler.sync()

    expect(container.scheduler.nextRunAt(discovery.id)).toBeNull()
  })

  it('到点自动采集：条目入库，坏源只影响自己', async () => {
    const good = addFastDiscovery({ name: '好源' })
    // 假源上没有这个地址，必定 404
    const bad = addFastDiscovery({
      name: '坏源',
      target: `${server.baseUrl}/broken`,
    })

    container.scheduler.start()
    await sleep(1600)

    expect(container.items.listByDiscovery(good.id)).toHaveLength(2)
    expect(container.discoveries.get(good.id)?.contentOk).toBe(true)
    expect(container.items.listByDiscovery(bad.id)).toHaveLength(0)
    expect(container.discoveries.get(bad.id)?.routeOk).toBe(false)
    // 采集过之后还会安排下一次
    expect(container.scheduler.nextRunAt(good.id)).toBeTruthy()
  }, 20000)

  it('全局并发上限真的起作用', async () => {
    container.settings.update({ concurrency: 1 })
    server.setDelay('/rss', 400)
    addFastDiscovery({ name: '源一' })
    addFastDiscovery({ name: '源二' })

    container.scheduler.start()
    // 等两轮触发：两个源会在同一秒开跑，并发上限必须把它们排成一队
    await sleep(2600)

    expect(server.requests.length).toBeGreaterThanOrEqual(4)
    expect(server.maxConcurrent).toBe(1)
  }, 20000)
})

describe('定时任务按时区算', () => {
  const from = new Date('2026-10-13T11:43:00.000Z')

  it('指定时区时按那个时区算：19:42 就是当地的 19:42', () => {
    // 北京 19:42 = 11:42Z；从 11:43Z 起算，下一次是第二天 19:00
    expect(nextRunAt('0,42 19 * * *', from, 'Asia/Shanghai')?.toISOString()).toBe(
      '2026-10-14T11:00:00.000Z',
    )
    // UTC 下同一个表达式就是 19:00Z
    expect(nextRunAt('0,42 19 * * *', from, 'UTC')?.toISOString()).toBe('2026-10-13T19:00:00.000Z')
  })

  it('system 与不传时区等价：跟随进程时区', () => {
    const expected = nextRunAt('0 3 * * *', from)?.toISOString()
    expect(expected).toBeTruthy()
    expect(nextRunAt('0 3 * * *', from, 'system')?.toISOString()).toBe(expected)
  })

  it('时区名写坏了也不影响排期：回落到进程时区', () => {
    const expected = nextRunAt('0 3 * * *', from)?.toISOString()
    expect(nextRunAt('0 3 * * *', from, 'Not/AZone')?.toISOString()).toBe(expected)
    expect(isValidCron('0 * * * *', 'Not/AZone')).toBe(true)
  })

  it('卡片上的「下次采集时间」按设置里的时区算', () => {
    const discovery = addDiscovery({ cronExpression: '0 19 * * *' })
    container.settings.update({ timezone: 'Asia/Shanghai' })

    container.scheduler.sync()

    // 北京 19:00 = 11:00Z，界面上不再显示成凌晨 3 点
    expect(container.scheduler.nextRunAt(discovery.id)).toMatch(/T11:00:00\.000Z$/)
    expect(container.discoveries.get(discovery.id)?.nextRunAt).toMatch(/T11:00:00\.000Z$/)
  })

  it('改了时区就重排：同一条表达式算出的时间跟着变', () => {
    const discovery = addDiscovery({ cronExpression: '0 19 * * *' })
    container.settings.update({ timezone: 'Asia/Shanghai' })
    container.scheduler.sync()
    const shanghai = container.scheduler.nextRunAt(discovery.id)

    container.settings.update({ timezone: 'UTC' })
    container.scheduler.sync()
    const utc = container.scheduler.nextRunAt(discovery.id)

    expect(shanghai).toMatch(/T11:00:00\.000Z$/)
    expect(utc).toMatch(/T19:00:00\.000Z$/)
    expect(utc).not.toBe(shanghai)
  })

  it('时区没变时不重排：任务对象还是原来那个', () => {
    const discovery = addDiscovery({ cronExpression: '0 19 * * *' })
    container.settings.update({ timezone: 'Asia/Shanghai' })
    container.scheduler.sync()
    const before = container.scheduler.nextRunAt(discovery.id)

    container.scheduler.sync()

    expect(container.scheduler.nextRunAt(discovery.id)).toBe(before)
  })
})
