import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

async function setup() {
  const { app, cleanup } = await createTestApp()
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
  const action = (
    await app.inject({
      method: 'POST',
      url: '/api/actions',
      payload: { groupId: group.id, name: '即时', channelId: channel.id },
    })
  ).json()
  return { app, cleanup, group, channel, action }
}

describe('监听接口', () => {
  it('默认跟随全局、中灵敏度，关键词默认空', async () => {
    const { app, cleanup, group } = await setup()
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: { groupId: group.id, name: '关注杨幂新片' },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({
        mode: 'follow_global',
        sensitivity: 'medium',
        includeKeywords: [],
        excludeKeywords: [],
        useGlobalExcludes: true,
        intentText: '',
        actionIds: [],
      })
    } finally {
      await cleanup()
    }
  })

  it('可以只走指定动作，动作必须属于同一个分组', async () => {
    const { app, cleanup, group, action } = await setup()
    try {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: {
          groupId: group.id,
          name: '只走即时',
          includeKeywords: ['新片', '定档'],
          intentText: '杨幂的新电影',
          actionIds: [action.id],
        },
      })
      expect(ok.statusCode).toBe(201)
      expect(ok.json().actionIds).toEqual([action.id])

      const otherGroup = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'H' } })
      ).json()
      const cross = await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: { groupId: otherGroup.id, name: '越组绑定', actionIds: [action.id] },
      })
      expect(cross.statusCode).toBe(400)
      expect(cross.json().error.code).toBe('validation_error')
    } finally {
      await cleanup()
    }
  })

  it('分组不存在时拒绝，非法模式被拦下', async () => {
    const { app, cleanup, group } = await setup()
    try {
      const missing = await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: { groupId: 'nope', name: 'X' },
      })
      expect(missing.statusCode).toBe(404)

      const bad = await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: { groupId: group.id, name: 'X', mode: 'magic' },
      })
      expect(bad.statusCode).toBe(400)
    } finally {
      await cleanup()
    }
  })

  it('被监听指定的动作删掉后，绑定自动解除', async () => {
    const { app, cleanup, group, action } = await setup()
    try {
      const monitor = (
        await app.inject({
          method: 'POST',
          url: '/api/monitors',
          payload: { groupId: group.id, name: 'M', actionIds: [action.id] },
        })
      ).json()
      await app.inject({ method: 'DELETE', url: `/api/actions/${action.id}` })
      expect(
        (await app.inject({ method: 'GET', url: `/api/monitors/${monitor.id}` })).json().actionIds,
      ).toEqual([])
    } finally {
      await cleanup()
    }
  })
})
