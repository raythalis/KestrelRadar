import { API_PREFIX } from '@kestrel/contracts'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { openDatabase } from '../src/db/index.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb } from './helpers/temp-db.ts'
import { createTestApp } from './helpers/test-app.ts'

/**
 * 仪表盘的最近事件列表（GET /events，只读）。
 * 事件本体由归并模块维护，这里盯三件事：路由挂上了、字段够界面用、按最近一次发生时间倒序。
 */

let server: FeedServer
let container: Container
let cleanupDb: () => void
let dbPath: string

beforeEach(async () => {
  const db = createTempDb()
  cleanupDb = db.cleanup
  dbPath = db.path
  container = buildContainer(openDatabase(db.path))
  server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
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

describe('最近事件列表', () => {
  it('采集出来的条目会进事件列表，字段够界面用', async () => {
    const group = container.groups.create({ name: '分组 A', description: '', enabled: true })
    const discovery = container.discoveries.create({
      groupId: group.id,
      name: '示例源',
      kind: 'rss',
      target: `${server.baseUrl}/rss`,
      cronExpression: '0 * * * *',
      enabled: true,
    })

    await container.collector.collectDiscovery(discovery.id)

    const app = await createTestApp(dbPath)
    try {
      // 路由挂在 API_PREFIX（/api）下
      const response = await app.app.inject({ method: 'GET', url: `${API_PREFIX}/events` })
      expect(response.statusCode).toBe(200)
      const events = response.json()
      expect(events.length).toBeGreaterThan(0)

      const first = events[0]
      expect(Object.keys(first).sort()).toEqual(
        [
          'firstItemAt',
          'groupId',
          'groupName',
          'id',
          'itemCount',
          'kind',
          'lastItemAt',
          'sourceCount',
          'sourceNames',
          'title',
          'url',
        ].sort(),
      )
      expect(first.groupName).toBe('分组 A')
      expect(first.sourceNames).toEqual(['示例源'])
      expect(first.kind).toBe('rss')
      expect(first.sourceCount).toBe(1)
      expect(first.title).toBeTruthy()
      expect(typeof first.lastItemAt).toBe('string')
    } finally {
      await app.cleanup()
    }
  })

  it('按最近一次发生时间倒序，条数按传入的 limit 截断', () => {
    const group = container.groups.create({ name: '分组 B', description: '', enabled: true })
    const older = container.events.create({
      groupId: group.id,
      title: '先发生的',
      url: 'https://example.com/a',
      urlKey: 'https://example.com/a',
      itemAt: '2026-10-01T00:00:00.000Z',
    })
    const newer = container.events.create({
      groupId: group.id,
      title: '后发生的',
      url: 'https://example.com/b',
      urlKey: 'https://example.com/b',
      itemAt: '2026-10-03T00:00:00.000Z',
    })

    const list = container.merger.listRecent(10)
    expect(list.map((event) => event.id)).toEqual([newer.id, older.id])
    expect(container.merger.listRecent(1)).toHaveLength(1)
  })

  it('归档的事件不进列表', () => {
    const group = container.groups.create({ name: '分组 C', description: '', enabled: true })
    const event = container.events.create({
      groupId: group.id,
      title: '老事件',
      url: null,
      urlKey: null,
      itemAt: '2026-01-01T00:00:00.000Z',
    })

    expect(container.merger.listRecent(10).map((item) => item.id)).toContain(event.id)
    container.merger.archiveStale(new Date('2026-10-04T00:00:00.000Z'))
    expect(container.merger.listRecent(10).map((item) => item.id)).not.toContain(event.id)
  })
})
