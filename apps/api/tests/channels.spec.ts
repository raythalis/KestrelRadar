import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

async function createGroup(app: Awaited<ReturnType<typeof createTestApp>>['app'], name = 'G') {
  return (await app.inject({ method: 'POST', url: '/api/groups', payload: { name } })).json()
}

describe('渠道接口', () => {
  it('密钥只进不出，接口只回一个 hasSecret', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const created = await app.inject({
        method: 'POST',
        url: '/api/channels',
        payload: {
          name: '我的 TG',
          type: 'telegram',
          config: { chatId: '12345' },
          secret: 'super-secret-token',
        },
      })
      expect(created.statusCode).toBe(201)
      expect(created.json()).toMatchObject({ name: '我的 TG', type: 'telegram', hasSecret: true })
      expect(created.body).not.toContain('super-secret-token')

      const listed = await app.inject({ method: 'GET', url: '/api/channels' })
      expect(listed.json()[0].config).toEqual({ chatId: '12345' })
      expect(listed.body).not.toContain('super-secret-token')
    } finally {
      await cleanup()
    }
  })

  it('渠道还被动作引用时不允许删除', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = await createGroup(app)
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

      const blocked = await app.inject({ method: 'DELETE', url: `/api/channels/${channel.id}` })
      expect(blocked.statusCode).toBe(409)
      expect(blocked.json().error.code).toBe('conflict')

      await app.inject({
        method: 'DELETE',
        url: `/api/actions/${(await app.inject({ method: 'GET', url: '/api/actions' })).json()[0].id}`,
      })
      const removed = await app.inject({ method: 'DELETE', url: `/api/channels/${channel.id}` })
      expect(removed.statusCode).toBe(204)
    } finally {
      await cleanup()
    }
  })
})
