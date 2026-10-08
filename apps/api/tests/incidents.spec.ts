import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import { RSS_TWO_ITEMS, PAGE_WITHOUT_FEED } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'
import { createTestApp } from './helpers/test-app.ts'

/** 一个合法的订阅源，但里面没有条目 —— 「通是通了，但没内容」 */
const EMPTY_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>空源</title>
    <link>https://example.com</link>
  </channel>
</rss>
`

let server: FeedServer
let container: Container
let cleanupDb: () => void

beforeEach(async () => {
  const db = createTempDb()
  cleanupDb = db.cleanup
  container = buildContainer(openTestDatabase(db.path))
  server = await startFeedServer({
    '/rss': { body: RSS_TWO_ITEMS },
    '/empty': { body: EMPTY_FEED },
    '/html': { body: PAGE_WITHOUT_FEED, contentType: 'text/html; charset=utf-8' },
  })
  container.settings.update({
    rsshubBaseUrl: server.baseUrl,
    requestTimeoutSeconds: 5,
    maxRetries: 0,
  })
})

afterEach(async () => {
  await server.stop()
  cleanupDb()
})

function addDiscovery(target: string, name = '源') {
  const group = container.groups.create({ name: '分组 A', description: '', enabled: true })
  const discovery = container.discoveries.create({
    groupId: group.id,
    name,
    kind: 'rss',
    target,
    cronExpression: '0 * * * *',
    enabled: true,
  })
  return { group, discovery }
}

describe('异常与采集流水', () => {
  it('采集成功：记一条流水、不开异常', async () => {
    const { discovery } = addDiscovery(`${server.baseUrl}/rss`)

    await container.collector.collectDiscovery(discovery.id)

    const runs = container.runs.listRecent(10)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({
      discoveryId: discovery.id,
      routeOk: true,
      contentOk: true,
      foundCount: 2,
      newCount: 2,
      code: null,
    })
    expect(container.incidents.list().incidents).toEqual([])
  })

  it('空源：只记流水（通是通了但没内容），不算失败、不开异常', async () => {
    const { discovery } = addDiscovery(`${server.baseUrl}/empty`)

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.routeOk).toBe(true)
    expect(outcome.code).toBe('feed.noEntry')
    const runs = container.runs.listRecent(10)
    expect(runs[0]).toMatchObject({ routeOk: true, contentOk: false, code: 'feed.noEntry' })
    expect(container.incidents.list().incidents).toEqual([])
  })

  it('采集失败：记一条流水，并开一条带分组名快照的异常', async () => {
    const { discovery } = addDiscovery(`${server.baseUrl}/html`, 'HTML 源')

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.code).toBe('feed.parseFailed')
    const runs = container.runs.listRecent(10)
    expect(runs[0]).toMatchObject({ routeOk: true, contentOk: false, code: 'feed.parseFailed' })

    const { incidents } = container.incidents.list()
    expect(incidents).toHaveLength(1)
    expect(incidents[0]).toMatchObject({
      kind: 'collection',
      targetId: discovery.id,
      targetName: 'HTML 源',
      groupName: '分组 A',
      code: 'feed.parseFailed',
      status: 'open',
      detail: null,
    })
    expect(incidents[0]?.message).toContain('订阅源')
  })

  it('HTTP 5xx：异常里留下语言无关的状态码（卡片副信息用它）', async () => {
    server.setSequence('/boom', [{ status: 503, body: 'down', contentType: 'text/plain' }])
    const { discovery } = addDiscovery(`${server.baseUrl}/boom`)

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.code).toBe('fetch.httpStatus')
    const incident = container.incidents.list().incidents[0]!
    expect(incident.code).toBe('fetch.httpStatus')
    expect(incident.detail).toBe('HTTP 503')
  })

  // 真的等一次超时：夹具里 requestTimeoutSeconds = 5（设置项下限也是 5）
  it('超时：异常里的副信息是超时秒数', async () => {
    server.setSequence('/slow', [{ hang: true }])
    const { discovery } = addDiscovery(`${server.baseUrl}/slow`)

    const outcome = await container.collector.collectDiscovery(discovery.id)

    expect(outcome.code).toBe('fetch.timeout')
    expect(container.incidents.list().incidents[0]?.detail).toBe('5s')
  }, 15_000)

  it('同一条错误在去重窗口内重复发生：只有一条，时间滚动、首次时间不动', async () => {
    const { discovery } = addDiscovery(`${server.baseUrl}/html`)

    await container.collector.collectDiscovery(discovery.id)
    const first = container.incidents.list().incidents[0]!
    await container.collector.collectDiscovery(discovery.id)
    const after = container.incidents.list().incidents

    expect(after).toHaveLength(1)
    expect(after[0]?.id).toBe(first.id)
    expect(after[0]?.firstSeenAt).toBe(first.firstSeenAt)
    // 流水不受去重影响：两轮就是两条
    expect(container.runs.listRecent(10)).toHaveLength(2)
  })

  it('忽视：库里保留、前端不再出现', async () => {
    const { discovery } = addDiscovery(`${server.baseUrl}/html`)
    await container.collector.collectDiscovery(discovery.id)
    const target = container.incidents.list().incidents[0]!

    const dismissed = container.incidents.dismiss(target.id)

    expect(dismissed.status).toBe('dismissed')
    expect(dismissed.dismissedAt).not.toBeNull()
    expect(container.incidents.list().incidents).toEqual([])
    // 库里还在
    expect(container.incidents.listAll().map((item) => item.id)).toContain(target.id)
  })

  it('上限：库与前端同为 20 条，超出先挤已忽视的、再挤最旧的', async () => {
    const record = (code: string) =>
      container.incidents.record({
        kind: 'collection',
        targetId: 'd-1',
        targetName: '源',
        groupId: null,
        groupName: '',
        code,
        message: code,
      })

    const oldest = record('code-1')
    const toDrop = record('code-2')
    container.incidents.dismiss(toDrop.id)
    for (let i = 3; i <= 21; i += 1) record(`code-${i}`)

    const ids = container.incidents.listAll().map((item) => item.id)
    expect(ids).toHaveLength(20)
    // 已忽视的那条先被挤掉
    expect(ids).not.toContain(toDrop.id)
    // 最旧但没被忽视的那条还在
    expect(ids).toContain(oldest.id)
    expect(container.incidents.list().incidents).toHaveLength(20)
  })
})

describe('异常接口', () => {
  it('空库：列表返回空数组与上限；忽视不存在的 id 报 404', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const empty = await app.inject({ method: 'GET', url: '/api/incidents' })
      expect(empty.statusCode).toBe(200)
      expect(empty.json()).toEqual({ incidents: [], limit: 20 })

      const missing = await app.inject({
        method: 'POST',
        url: '/api/incidents/not-a-real-id/dismiss',
      })
      expect(missing.statusCode).toBe(404)
      expect(missing.json().error.code).toBe('NOT_FOUND')
    } finally {
      await cleanup()
    }
  })
})
