import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('动作接口', () => {
  it('渠道不存在时拒绝，正常创建后返回渠道信息字段', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const bad = await app.inject({
        method: 'POST',
        url: '/api/actions',
        payload: { groupId: group.id, name: 'X', channelId: 'nope' },
      })
      expect(bad.statusCode).toBe(404)

      const channel = (
        await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: { name: 'hook', type: 'webhook', config: { url: 'http://example.com/hook' } },
        })
      ).json()
      const digest = await app.inject({
        method: 'POST',
        url: '/api/actions',
        payload: {
          groupId: group.id,
          name: '每日汇总',
          channelId: channel.id,
          triggerType: 'digest',
          cronExpression: '0 9 * * *',
          includeDelivered: true,
          templateId: null,
        },
      })
      expect(digest.statusCode).toBe(201)
      expect(digest.json()).toMatchObject({
        triggerType: 'digest',
        cronExpression: '0 9 * * *',
        includeDelivered: true,
        templateId: null,
      })
    } finally {
      await cleanup()
    }
  })

  it('删除分组会连带删掉它的动作', async () => {
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
        payload: { groupId: group.id, name: 'A', channelId: channel.id },
      })
      await app.inject({ method: 'DELETE', url: `/api/groups/${group.id}` })
      expect((await app.inject({ method: 'GET', url: '/api/actions' })).json()).toHaveLength(0)
    } finally {
      await cleanup()
    }
  })
})
