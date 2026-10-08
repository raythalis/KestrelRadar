import { API_PREFIX } from '@kestrel/contracts'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { buildFingerprint } from '../src/modules/collection/fingerprint.ts'

import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'
import { createTestApp } from './helpers/test-app.ts'

/**
 * 最近事件：24 小时窗口、游标分页、来源筛选、来源标签、未读。
 * 时间全部由调用方传「现在」，所以窗口边界和翻页都能精确断言。
 */

const HOUR = 60 * 60 * 1000
const NOW = new Date(Date.now() - 60_000)

let container: Container
let cleanupDb: () => void
let dbPath: string

beforeEach(() => {
  const db = createTempDb()
  cleanupDb = db.cleanup
  dbPath = db.path
  container = buildContainer(openTestDatabase(db.path))
})

afterEach(() => cleanupDb())

function seedGroup(name = '分组'): { groupId: string; sources: Record<'A' | 'B' | 'C', string> } {
  const group = container.groups.create({ name, description: '', enabled: true })
  const create = (sourceName: string): string =>
    container.discoveries.create({
      groupId: group.id,
      name: sourceName,
      kind: 'rss',
      target: `https://${sourceName}.example.com/feed`,
      cronExpression: '0 * * * *',
      enabled: true,
    }).id
  return { groupId: group.id, sources: { A: create('源A'), B: create('源B'), C: create('源C') } }
}

/** 造一条条目并把它挂进事件；每个来源转的那条带自己的链接后缀，方便断言标签指向哪家 */
function seedEvent(input: { groupId: string; discoveryIds: string[]; title: string; at: string }): {
  id: string
} {
  const url = `https://example.com/${encodeURIComponent(input.title)}`
  const event = container.events.create({
    groupId: input.groupId,
    title: input.title,
    url,
    urlKey: null,
    itemAt: input.at,
  })
  input.discoveryIds.forEach((discoveryId, index) => {
    const title = index === 0 ? input.title : `${input.title}（转 ${index}）`
    const itemUrl = `${url}?from=${index}`
    container.items.record(
      discoveryId,
      {
        title,
        url: itemUrl,
        summary: '正文内容',
        sourcePublishedAt: input.at,
        fingerprint: buildFingerprint({ url: itemUrl, title, summary: '正文内容' }),
      },
      input.at,
    )
    const item = container.items.listByDiscovery(discoveryId).at(-1)
    if (!item) throw new Error('条目没写进去')
    container.events.addItem(event.id, item.id, discoveryId, input.at)
  })
  return event
}

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * HOUR).toISOString()
}

describe('最近事件窗口与分页', () => {
  it('只看 24 小时窗口内还有动静的事件', () => {
    const { groupId, sources } = seedGroup()
    const inside = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '昨天的',
      at: hoursAgo(23),
    })
    seedEvent({ groupId, discoveryIds: [sources.A], title: '前天的', at: hoursAgo(25) })

    const page = container.merger.list({}, NOW)
    expect(page.events.map((event) => event.id)).toEqual([inside.id])
  })

  it('游标翻页不漏不重，最后一页不再给游标', () => {
    const { groupId, sources } = seedGroup()
    const ids = [1, 2, 3, 4, 5].map(
      (index) =>
        seedEvent({
          groupId,
          discoveryIds: [sources.A],
          title: `事件 ${index}`,
          at: hoursAgo(index),
        }).id,
    )

    const seen: string[] = []
    let cursor: string | undefined
    let pages = 0
    for (;;) {
      const page = container.merger.list({ cursor, limit: 2 }, NOW)
      seen.push(...page.events.map((event) => event.id))
      pages += 1
      if (!page.nextCursor) break
      cursor = page.nextCursor
    }
    expect(pages).toBe(3)
    expect(seen).toEqual(ids)
    expect(new Set(seen).size).toBe(ids.length)
  })

  it('翻页途中来了新事件，已翻过的那几条不会重复出现', () => {
    const { groupId, sources } = seedGroup()
    const old = [1, 2, 3].map((index) =>
      seedEvent({ groupId, discoveryIds: [sources.A], title: `旧 ${index}`, at: hoursAgo(index) }),
    )

    const first = container.merger.list({ limit: 2 }, NOW)
    expect(first.events.map((event) => event.id)).toEqual([old[0]!.id, old[1]!.id])

    const fresh = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '刚发生的',
      at: hoursAgo(0.5),
    })
    const second = container.merger.list({ cursor: first.nextCursor ?? undefined, limit: 2 }, NOW)
    const seen = [...first.events, ...second.events].map((event) => event.id)
    expect(second.events.map((event) => event.id)).toEqual([old[2]!.id])
    expect(seen).not.toContain(fresh.id)
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('窗口内按最近一次发生时间倒序', () => {
    const { groupId, sources } = seedGroup()
    const older = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '先发生的',
      at: hoursAgo(4),
    })
    const newer = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '后发生的',
      at: hoursAgo(2),
    })
    expect(container.merger.list({}, NOW).events.map((event) => event.id)).toEqual([
      newer.id,
      older.id,
    ])
  })

  it('total 给窗口内总数：翻页到哪一页都是同一个数，并且跟着来源筛选走', () => {
    const { groupId, sources } = seedGroup()
    ;[1, 2, 3, 4, 5].forEach((index) =>
      seedEvent({
        groupId,
        discoveryIds: [sources.A],
        title: `事件 ${index}`,
        at: hoursAgo(index),
      }),
    )
    seedEvent({ groupId, discoveryIds: [sources.B], title: 'B 的事', at: hoursAgo(1) })
    // 30 小时前那条已经出窗口，不算在内
    seedEvent({ groupId, discoveryIds: [sources.A], title: '出窗口的', at: hoursAgo(30) })

    const first = container.merger.list({ limit: 2 }, NOW)
    expect(first.events).toHaveLength(2)
    expect(first.total).toBe(6)

    const second = container.merger.list({ cursor: first.nextCursor ?? undefined, limit: 2 }, NOW)
    expect(second.total).toBe(6)

    expect(container.merger.list({ discoveryId: sources.A }, NOW).total).toBe(5)
    expect(container.merger.list({ discoveryId: sources.B }, NOW).total).toBe(1)
  })
})

describe('来源筛选与来源标签', () => {
  it('按来源筛选只给这个来源提到的事件', () => {
    const { groupId, sources } = seedGroup()
    const fromA = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: 'A 的事',
      at: hoursAgo(1),
    })
    seedEvent({ groupId, discoveryIds: [sources.B], title: 'B 的事', at: hoursAgo(2) })

    const page = container.merger.list({ discoveryId: sources.A }, NOW)
    expect(page.events.map((event) => event.id)).toEqual([fromA.id])
  })

  it('来源清单给每个来源的窗口内计数', () => {
    const { groupId, sources } = seedGroup()
    seedEvent({ groupId, discoveryIds: [sources.A], title: 'A 一', at: hoursAgo(1) })
    seedEvent({ groupId, discoveryIds: [sources.A, sources.B], title: 'A B 一起', at: hoursAgo(2) })
    seedEvent({ groupId, discoveryIds: [sources.B], title: 'B 一', at: hoursAgo(30) })

    const options = container.merger.sources(NOW)
    const byName = new Map(options.map((option) => [option.name, option.count]))
    expect(byName.get('源A')).toBe(2)
    // 30 小时前那条已经出窗口，不算
    expect(byName.get('源B')).toBe(1)
  })

  it('事件行给全部来源，各自带自己的原文链接', () => {
    const { groupId, sources } = seedGroup()
    seedEvent({
      groupId,
      discoveryIds: [sources.A, sources.B, sources.C],
      title: '三家都在说',
      at: hoursAgo(1),
    })

    const event = container.merger.list({}, NOW).events[0]
    expect(event?.sourceCount).toBe(3)
    // 全给（不截到两个）：界面只把前 EVENT_SOURCE_TAG_LIMIT 个挂成标签，其余收进 +N 浮层
    expect(event?.sources.map((source) => source.name)).toEqual(['源A', '源B', '源C'])
    expect(event?.sources[0]?.url).toContain('from=0')
    expect(event?.sources[1]?.url).toContain('from=1')
    expect(event?.sources[2]?.url).toContain('from=2')
    // 默认打开的原文就是第一个来源那条
    expect(event?.url).toContain('from=0')
  })
})

describe('未读状态', () => {
  it('新事件默认未读，点过之后记下时间，重复点不改第一次的时间', () => {
    const { groupId, sources } = seedGroup()
    const event = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '待看的事',
      at: hoursAgo(1),
    })
    expect(container.merger.list({}, NOW).events[0]?.readAt).toBeNull()

    const first = container.merger.markRead(event.id, NOW)
    expect(first.readAt).toBe(NOW.toISOString())
    expect(container.merger.list({}, NOW).events[0]?.readAt).toBe(NOW.toISOString())

    const later = new Date(NOW.getTime() + HOUR)
    expect(container.merger.markRead(event.id, later).readAt).toBe(NOW.toISOString())
  })

  it('已读的事件再来新条目、多一个来源，也不会退回未读', () => {
    const { groupId, sources } = seedGroup()
    const event = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '会被转载的事',
      at: hoursAgo(6),
    })
    container.merger.markRead(event.id, NOW)

    // 另一个来源转载了同一件事：挂进同一个事件，最近一次发生时间被推新
    const itemUrl = 'https://example.com/repost'
    container.items.record(
      sources.B,
      {
        title: '会被转载的事（转）',
        url: itemUrl,
        summary: '正文内容',
        sourcePublishedAt: hoursAgo(1),
        fingerprint: buildFingerprint({
          url: itemUrl,
          title: '会被转载的事（转）',
          summary: '正文内容',
        }),
      },
      hoursAgo(1),
    )
    const repost = container.items.listByDiscovery(sources.B).at(-1)
    container.events.addItem(event.id, repost!.id, sources.B, hoursAgo(1))

    const row = container.merger.list({}, NOW).events[0]
    expect(row?.id).toBe(event.id)
    expect(row?.lastItemAt).toBe(hoursAgo(1))
    expect(row?.sourceCount).toBe(2)
    expect(row?.readAt).toBe(NOW.toISOString())
  })

  it('不存在的事件标已读会报找不到', () => {
    expect(() => container.merger.markRead('不存在', NOW)).toThrowError(/事件不存在/)
  })
})

describe('最近事件接口', () => {
  it('GET /events 给一页 + 来源清单 + 标已读', async () => {
    const { groupId, sources } = seedGroup()
    const event = seedEvent({
      groupId,
      discoveryIds: [sources.A],
      title: '接口里的事',
      at: hoursAgo(1),
    })
    const app = await createTestApp(dbPath)
    try {
      const list = await app.app.inject({ method: 'GET', url: `${API_PREFIX}/events?limit=1` })
      expect(list.statusCode).toBe(200)
      const page = list.json()
      expect(page.events).toHaveLength(1)
      expect(page.events[0].id).toBe(event.id)
      expect(page.events[0].readAt).toBeNull()

      const sourcesResponse = await app.app.inject({
        method: 'GET',
        url: `${API_PREFIX}/events/sources`,
      })
      expect(sourcesResponse.statusCode).toBe(200)
      expect(sourcesResponse.json()[0]).toMatchObject({
        discoveryId: sources.A,
        name: '源A',
        count: 1,
      })

      const marked = await app.app.inject({
        method: 'POST',
        url: `${API_PREFIX}/events/${event.id}/read`,
      })
      expect(marked.statusCode).toBe(200)
      expect(marked.json().readAt).toBeTruthy()

      const invalid = await app.app.inject({
        method: 'GET',
        url: `${API_PREFIX}/events?cursor=不是游标`,
      })
      expect(invalid.statusCode).toBe(400)

      const badLimit = await app.app.inject({ method: 'GET', url: `${API_PREFIX}/events?limit=0` })
      expect(badLimit.statusCode).toBe(400)

      const missing = await app.app.inject({
        method: 'POST',
        url: `${API_PREFIX}/events/不存在/read`,
      })
      expect(missing.statusCode).toBe(404)
    } finally {
      await app.cleanup()
    }
  })
})
