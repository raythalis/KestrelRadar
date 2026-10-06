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
 * 事件本体由归并模块维护，这里盯四件事：路由挂上了、字段够界面用、
 * 按最近一次发生时间倒序、只给 24 小时窗口内的事。
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
      const page = response.json()
      expect(page.events.length).toBeGreaterThan(0)
      expect(page.nextCursor).toBeNull()

      const first = page.events[0]
      expect(Object.keys(first).sort()).toEqual(
        [
          'firstItemAt',
          'groupId',
          'groupName',
          'id',
          'itemCount',
          'kind',
          'lastItemAt',
          'readAt',
          'sourceCount',
          'sourceNames',
          'sources',
          'title',
          'url',
        ].sort(),
      )
      expect(first.groupName).toBe('分组 A')
      expect(first.sourceNames).toEqual(['示例源'])
      expect(first.sources.map((source: { name: string }) => source.name)).toEqual(['示例源'])
      expect(first.sources[0].url).toBeTruthy()
      // 还没点开过，所以是未读
      expect(first.readAt).toBeNull()
      expect(first.kind).toBe('rss')
      expect(first.sourceCount).toBe(1)
      expect(first.title).toBeTruthy()
      expect(typeof first.lastItemAt).toBe('string')
    } finally {
      await app.cleanup()
    }
  })

  it('窗口内按最近一次发生时间倒序，条数按传入的 limit 截断', () => {
    const group = container.groups.create({ name: '分组 B', description: '', enabled: true })
    const now = new Date('2026-10-04T00:00:00.000Z')
    const older = container.events.create({
      groupId: group.id,
      title: '先发生的',
      url: 'https://example.com/a',
      urlKey: 'https://example.com/a',
      itemAt: '2026-10-03T20:00:00.000Z',
    })
    const newer = container.events.create({
      groupId: group.id,
      title: '后发生的',
      url: 'https://example.com/b',
      urlKey: 'https://example.com/b',
      itemAt: '2026-10-03T23:00:00.000Z',
    })
    // 一天多以前的事已经出了 24 小时窗口
    container.events.create({
      groupId: group.id,
      title: '很久以前的',
      url: 'https://example.com/c',
      urlKey: 'https://example.com/c',
      itemAt: '2026-10-02T20:00:00.000Z',
    })

    const list = container.merger.list({ limit: 10 }, now).events
    expect(list.map((event) => event.id)).toEqual([newer.id, older.id])
    expect(container.merger.list({ limit: 1 }, now).events).toHaveLength(1)
  })

  it('出了窗口的事件不在列表里；定时打扫把长期不动的事件归档', () => {
    const group = container.groups.create({ name: '分组 C', description: '', enabled: true })
    const event = container.events.create({
      groupId: group.id,
      title: '老事件',
      url: null,
      urlKey: null,
      itemAt: '2026-01-01T00:00:00.000Z',
    })
    const now = new Date('2026-01-20T00:00:00.000Z')

    // 窗口只认最近 24 小时，所以两条路都看不到它
    expect(container.merger.list({ limit: 10 }, now).events.map((item) => item.id)).not.toContain(
      event.id,
    )
    expect(container.merger.archiveStale(now)).toBe(1)
    expect(container.events.get(event.id)?.status).toBe('archived')
  })
})
