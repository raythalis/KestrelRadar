import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'
import { RSS_TWO_ITEMS, PAGE_WITHOUT_FEED } from './helpers/feed-fixtures.ts'
import { startFeedServer } from './helpers/feed-server.ts'

async function seed(app: Awaited<ReturnType<typeof createTestApp>>['app'], serverUrl: string) {
  const group = (
    await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
  ).json()
  const discovery = (
    await app.inject({
      method: 'POST',
      url: '/api/discoveries',
      payload: {
        groupId: group.id,
        name: '源',
        kind: 'rss',
        target: `${serverUrl}/rss`,
        cronExpression: '0 * * * *',
      },
    })
  ).json()
  return { group, discovery }
}

describe('发现测试接口', () => {
  it('两级都通：报条数、最近一条时间，并把状态记到卡片上', async () => {
    const server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
    const { app, cleanup } = await createTestApp()
    try {
      const { discovery } = await seed(app, server.baseUrl)

      const res = await app.inject({ method: 'POST', url: `/api/discoveries/${discovery.id}/test` })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        routeOk: true,
        contentOk: true,
        foundItemCount: 2,
        latestItemAt: '2026-09-30T12:00:00.000Z',
      })

      const snapshot = (await app.inject({ method: 'GET', url: '/api/config' })).json()
      const card = snapshot.discoveries[0]
      expect(card.contentOk).toBe(true)
      expect(card.lastCheckedAt).toBeTruthy()
      // 测试只探测、不入库
      expect(card.itemCount).toBe(0)
      expect(card.baselineEstablishedAt).toBeNull()
    } finally {
      await cleanup()
      await server.stop()
    }
  })

  it('页面拿得到但不是订阅源：路由通、内容不通，给一句人话', async () => {
    const server = await startFeedServer({
      '/notafeed': { body: PAGE_WITHOUT_FEED, contentType: 'text/html' },
    })
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const discovery = (
        await app.inject({
          method: 'POST',
          url: '/api/discoveries',
          payload: {
            groupId: group.id,
            name: '页面',
            kind: 'rss',
            target: `${server.baseUrl}/notafeed`,
            cronExpression: '0 * * * *',
          },
        })
      ).json()

      const res = await app.inject({ method: 'POST', url: `/api/discoveries/${discovery.id}/test` })

      expect(res.json()).toMatchObject({ routeOk: true, contentOk: false })
      expect(res.json().message).toContain('订阅源')
    } finally {
      await cleanup()
      await server.stop()
    }
  })

  it('请求体是空的 JSON：报 400，不报 500', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const discovery = (
        await app.inject({
          method: 'POST',
          url: '/api/discoveries',
          payload: {
            groupId: group.id,
            name: '源',
            kind: 'rss',
            target: 'http://127.0.0.1:9/rss',
            cronExpression: '0 * * * *',
          },
        })
      ).json()

      const response = await app.inject({
        method: 'POST',
        url: `/api/discoveries/${discovery.id}/test`,
        headers: { 'content-type': 'application/json' },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error.code).toBe('validation_error')
    } finally {
      await cleanup()
    }
  })
})
