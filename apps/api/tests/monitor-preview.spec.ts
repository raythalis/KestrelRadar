import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { openDatabase } from '../src/db/index.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb } from './helpers/temp-db.ts'
import { createTestApp } from './helpers/test-app.ts'

let server: FeedServer
let container: Container
let cleanupDb: () => void

beforeEach(async () => {
  const db = createTempDb()
  cleanupDb = db.cleanup
  container = buildContainer(openDatabase(db.path))
  server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
})

afterEach(async () => {
  await server.stop()
  cleanupDb()
})

function seed() {
  const group = container.groups.create({ name: 'G', description: '', enabled: true })
  const discovery = container.discoveries.create({
    groupId: group.id,
    name: '源',
    kind: 'rss',
    target: `${server.baseUrl}/rss`,
    cronExpression: '0 * * * *',
    enabled: true,
  })
  const monitor = container.monitors.create({
    groupId: group.id,
    name: '监听',
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
  return { group, discovery, monitor }
}

describe('规则预览（试跑，不落库）', () => {
  it('拿最近采集到的内容试跑：给出命中条数、样例与理由', async () => {
    const { discovery, monitor } = seed()
    await container.collector.collectDiscovery(discovery.id)

    const preview = await container.judge.preview(monitor.id, { sampleSize: 5 })

    expect(preview.total).toBe(2)
    expect(preview.matched + preview.dropped).toBe(2)
    expect(preview.samples.length).toBeGreaterThan(0)
    expect(preview.samples[0]?.reasons.length).toBeGreaterThan(0)
    // 试跑不调模型，只提示「这批会走模型」
    expect(typeof preview.needsModel).toBe('boolean')
  })

  it('试跑用传进来的规则，不保存也不写判定记录', async () => {
    const { discovery, monitor } = seed()
    await container.collector.collectDiscovery(discovery.id)

    const before = container.judgments.listByMonitor(monitor.id).length
    const loose = await container.judge.preview(monitor.id, {})
    const strict = await container.judge.preview(monitor.id, {
      rules: { includeKeywords: ['第一篇文章', '第二篇文章', '第三篇文章'] },
    })

    expect(strict.total).toBe(loose.total)
    // 试跑不写判定记录（采集时的自动判定不在这个口径里）
    expect(container.judgments.listByMonitor(monitor.id)).toHaveLength(before)
    // 监听本身没被改
    expect(container.monitors.get(monitor.id)?.includeKeywords).toEqual([])
  })
})

describe('规则预览接口', () => {
  it('POST /api/monitors/:id/preview 返回试跑结果', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const monitor = (
        await app.inject({
          method: 'POST',
          url: '/api/monitors',
          payload: {
            groupId: group.id,
            name: '监听',
            mode: 'algorithm',
            sensitivity: 'medium',
            matchMode: 'any',
            includeKeywords: ['开源'],
            excludeKeywords: [],
            useGlobalExcludes: false,
            intentText: '',
            enabled: true,
            actionIds: [],
          },
        })
      ).json()

      const res = await app.inject({
        method: 'POST',
        url: `/api/monitors/${monitor.id}/preview`,
        payload: { sampleSize: 3 },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ total: 0, matched: 0, dropped: 0 })
      expect(Array.isArray(res.json().samples)).toBe(true)
      expect(monitor.matchMode).toBe('any')
    } finally {
      await cleanup()
    }
  })
})
