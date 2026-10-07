import { OPERATION_CODES, FAILURE_CODES } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

import { DeliveryError } from '../src/modules/delivery/sender.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer } from './helpers/feed-server.ts'
import { createTestApp } from './helpers/test-app.ts'

/** 业务结果：请求本身成功（HTTP 200 + success:true），业务成不成看 data.ok */
describe('业务操作结果', () => {
  it('渠道测试：发不出去也是 200 + success:true + ok:false + 业务码', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const channel = (
        await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: {
            name: '发不出去的钩子',
            type: 'webhook',
            config: { url: 'http://127.0.0.1:9/hook' },
          },
        })
      ).json()

      const res = await app.inject({ method: 'POST', url: `/api/channels/${channel.id}/test` })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.success).toBe(true)
      expect(body.data.ok).toBe(false)
      expect(OPERATION_CODES).toContain(body.data.code)
      // 细码只给日志与统计，不进界面文案
      expect(FAILURE_CODES).toContain(body.data.details.reason)
      expect(typeof body.data.message).toBe('string')
    } finally {
      await cleanup()
    }
  })

  it('渠道测试：通了就是 ok:true，成功不再带码', async () => {
    const server = await startFeedServer({ '/hook': { body: 'ok' } })
    const { app, cleanup } = await createTestApp()
    try {
      const channel = (
        await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: { name: '钩子', type: 'webhook', config: { url: `${server.baseUrl}/hook` } },
        })
      ).json()

      const res = await app.inject({ method: 'POST', url: `/api/channels/${channel.id}/test` })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toMatchObject({ ok: true })
      expect(res.json().data.code).toBeUndefined()
    } finally {
      await cleanup()
      await server.stop()
    }
  })

  it('渠道 id 不存在：这是 API Error，走 404 NOT_FOUND，不装成业务失败', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({ method: 'POST', url: '/api/channels/nope/test' })
      expect(res.statusCode).toBe(404)
      const body = res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('NOT_FOUND')
      expect(body.data).toBeUndefined()
    } finally {
      await cleanup()
    }
  })

  it('读会话：token 不对是业务失败（AUTH_FAILED），不是请求失败', async () => {
    const telegram = {
      async listChats() {
        throw new DeliveryError('delivery.telegramNoToken')
      },
      async send() {},
    }
    const { app, cleanup } = await createTestApp(undefined, telegram as never)
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/channels/telegram/chats',
        payload: { token: '123:不对的' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.success).toBe(true)
      expect(body.data.ok).toBe(false)
      expect(body.data.code).toBe('AUTH_FAILED')
      // 细码只给日志与统计，不铺到界面上
      expect(body.data.details.reason).toBe('delivery.telegramNoToken')
      // 失败时可以没有负载
      expect(body.data.data).toBeUndefined()
    } finally {
      await cleanup()
    }
  })

  it('读会话：真的拿到列表就是 ok:true', async () => {
    const telegram = {
      async listChats() {
        return [{ id: '1', title: '我的群', type: 'group' }]
      },
      async send() {},
    }
    const { app, cleanup } = await createTestApp(undefined, telegram as never)
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/channels/telegram/chats',
        payload: { token: '123:abc' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.success).toBe(true)
      expect(body.data.ok).toBe(true)
      // 成功由 ok 表达，业务码只在失败时出现
      expect(body.data.code).toBeUndefined()
      expect(body.data.data.chats).toHaveLength(1)
    } finally {
      await cleanup()
    }
  })

  it('发现测试：连不上也是 200 + ok:false，不抛 500', async () => {
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

      const res = await app.inject({ method: 'POST', url: `/api/discoveries/${discovery.id}/test` })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.success).toBe(true)
      expect(body.data.ok).toBe(false)
      expect(OPERATION_CODES).toContain(body.data.code)
    } finally {
      await cleanup()
    }
  })

  it('发现测试：两级都通就是 ok:true，成功不再带码', async () => {
    const server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
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
            target: `${server.baseUrl}/rss`,
            cronExpression: '0 * * * *',
          },
        })
      ).json()

      const res = await app.inject({ method: 'POST', url: `/api/discoveries/${discovery.id}/test` })
      const body = res.json()
      expect(body.data).toMatchObject({ ok: true })
      expect(body.data.code).toBeUndefined()
      expect(body.data.data.foundItemCount).toBe(2)
    } finally {
      await cleanup()
      await server.stop()
    }
  })
})
