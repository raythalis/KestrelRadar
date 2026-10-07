import { describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.ts'
import { createTempDb } from './helpers/temp-db.ts'
import { createTestApp } from './helpers/test-app.ts'

describe('API 错误响应', () => {
  it('资源不存在：success:false + NOT_FOUND', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/groups/nope' })
      expect(res.statusCode).toBe(404)
      const body = res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('NOT_FOUND')
      expect(typeof body.error.message).toBe('string')
      expect(body.error.message.length).toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })

  it('没有这个接口：也是 NOT_FOUND', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/no-such-route' })
      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('NOT_FOUND')
    } finally {
      await cleanup()
    }
  })

  it('还被别处引用：CONFLICT', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const channel = (
        await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: { name: 'hook', type: 'webhook', config: { url: 'http://example.com/hook' } },
        })
      ).json()
      await app.inject({
        method: 'POST',
        url: '/api/actions',
        payload: { groupId: group.id, name: '即时通知', channelId: channel.id },
      })

      const res = await app.inject({ method: 'DELETE', url: `/api/channels/${channel.id}` })
      expect(res.statusCode).toBe(409)
      const body = res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('CONFLICT')
    } finally {
      await cleanup()
    }
  })

  it('校验失败：VALIDATION_ERROR，并且说清是哪个字段、哪条规则', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const cases: {
        payload: Record<string, unknown>
        url: string
        field: string
        rule: string
      }[] = [
        { url: '/api/groups', payload: { name: '' }, field: 'name', rule: 'REQUIRED_FIELD' },
        {
          url: '/api/groups',
          payload: { name: 'x'.repeat(61) },
          field: 'name',
          rule: 'TOO_LONG',
        },
        {
          url: '/api/channels',
          payload: { name: 'hook', type: 'webhook', config: { url: '不是地址' } },
          field: 'config.url',
          rule: 'INVALID_URL',
        },
      ]

      for (const item of cases) {
        const res = await app.inject({ method: 'POST', url: item.url, payload: item.payload })
        expect(res.statusCode).toBe(400)
        const body = res.json()
        expect(body.success).toBe(false)
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(body.error.details).toMatchObject({ field: item.field, rule: item.rule })
      }
    } finally {
      await cleanup()
    }
  })

  it('定时表达式不合法：INVALID_CRON', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const res = await app.inject({
        method: 'POST',
        url: '/api/discoveries',
        payload: {
          groupId: group.id,
          name: '源',
          kind: 'rss',
          target: 'https://example.com/feed.xml',
          cronExpression: '99 99 * * *',
        },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
      expect(res.json().error.details).toMatchObject({
        field: 'cronExpression',
        rule: 'INVALID_CRON',
      })
    } finally {
      await cleanup()
    }
  })

  it('条目给太多：TOO_MANY_ITEMS', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const res = await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: {
          groupId: group.id,
          name: '监听',
          includeKeywords: Array.from({ length: 201 }, (_, i) => `词${i}`),
        },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.details.rule).toBe('TOO_MANY_ITEMS')
    } finally {
      await cleanup()
    }
  })

  it('没料到的异常：INTERNAL_ERROR，且日志里带错误码和请求上下文', async () => {
    const db = createTempDb()
    const lines: string[] = []
    const app = await buildApp({
      dbPath: db.path,
      logger: { level: 'error', stream: { write: (line: string) => void lines.push(line) } },
    })
    try {
      app.get('/api/__boom', () => {
        throw new Error('boom')
      })

      const res = await app.inject({ method: 'GET', url: '/api/__boom' })
      expect(res.statusCode).toBe(500)
      const body = res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('INTERNAL_ERROR')
      // 日志里要能按码查，而不是只有一句 message
      expect(lines.join('')).toContain('INTERNAL_ERROR')
      expect(lines.join('')).toContain('/api/__boom')
      expect(lines.join('')).toContain('boom')
    } finally {
      await app.close()
      db.cleanup()
    }
  })
})
