import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('分组接口', () => {
  it('建、查、改、删走通一遍', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const created = await app.inject({
        method: 'POST',
        url: '/api/groups',
        payload: { name: 'AI 动态', description: '关注模型与工具更新' },
      })
      expect(created.statusCode).toBe(201)
      const group = created.json()
      expect(group).toMatchObject({
        name: 'AI 动态',
        description: '关注模型与工具更新',
        enabled: true,
      })
      expect(group.id).toBeTruthy()

      const listed = await app.inject({ method: 'GET', url: '/api/groups' })
      expect(listed.json()).toHaveLength(1)

      const patched = await app.inject({
        method: 'PATCH',
        url: `/api/groups/${group.id}`,
        payload: { name: 'AI 与工具' },
      })
      expect(patched.json().name).toBe('AI 与工具')

      const removed = await app.inject({ method: 'DELETE', url: `/api/groups/${group.id}` })
      expect(removed.statusCode).toBe(204)

      const gone = await app.inject({ method: 'GET', url: `/api/groups/${group.id}` })
      expect(gone.statusCode).toBe(404)
      expect(gone.json().error.code).toBe('NOT_FOUND')
    } finally {
      await cleanup()
    }
  })

  it('名称为空时拒绝，并给出 validation_error', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({ method: 'POST', url: '/api/groups', payload: { name: '' } })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
    } finally {
      await cleanup()
    }
  })

  it('删除分组时连带删掉它的发现', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      await app.inject({
        method: 'POST',
        url: '/api/discoveries',
        payload: {
          groupId: group.id,
          name: 'D',
          kind: 'rsshub',
          target: 'https://example.com',
          cronExpression: '0 * * * *',
        },
      })
      expect((await app.inject({ method: 'GET', url: '/api/discoveries' })).json()).toHaveLength(1)
      await app.inject({ method: 'DELETE', url: `/api/groups/${group.id}` })
      expect((await app.inject({ method: 'GET', url: '/api/discoveries' })).json()).toHaveLength(0)
    } finally {
      await cleanup()
    }
  })

  it('分组开关带着组内卡片一起走：关掉分组三条一起停用，开回来一起启用', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const channel = (
        await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: {
            name: 'Webhook',
            type: 'webhook',
            config: { url: 'https://hook.example.com/x' },
          },
        })
      ).json()
      await app.inject({
        method: 'POST',
        url: '/api/discoveries',
        payload: {
          groupId: group.id,
          name: 'D',
          kind: 'rsshub',
          target: '/example',
          cronExpression: '0 * * * *',
        },
      })
      await app.inject({
        method: 'POST',
        url: '/api/monitors',
        payload: { groupId: group.id, name: 'M' },
      })
      await app.inject({
        method: 'POST',
        url: '/api/actions',
        payload: { groupId: group.id, name: 'A', channelId: channel.id },
      })

      const states = async () => ({
        group: (await app.inject({ method: 'GET', url: `/api/groups/${group.id}` })).json().enabled,
        discoveries: (await app.inject({ method: 'GET', url: '/api/discoveries' })).json(),
        monitors: (await app.inject({ method: 'GET', url: '/api/monitors' })).json(),
        actions: (await app.inject({ method: 'GET', url: '/api/actions' })).json(),
      })

      await app.inject({
        method: 'PATCH',
        url: `/api/groups/${group.id}`,
        payload: { enabled: false },
      })
      const off = await states()
      expect(off.discoveries.map((row: { enabled: boolean }) => row.enabled)).toEqual([false])
      expect(off.monitors.map((row: { enabled: boolean }) => row.enabled)).toEqual([false])
      expect(off.actions.map((row: { enabled: boolean }) => row.enabled)).toEqual([false])

      await app.inject({
        method: 'PATCH',
        url: `/api/groups/${group.id}`,
        payload: { enabled: true },
      })
      const on = await states()
      expect(on.discoveries.map((row: { enabled: boolean }) => row.enabled)).toEqual([true])
      expect(on.monitors.map((row: { enabled: boolean }) => row.enabled)).toEqual([true])
      expect(on.actions.map((row: { enabled: boolean }) => row.enabled)).toEqual([true])
    } finally {
      await cleanup()
    }
  })

  it('反向同理：组里只要还有一条启用，分组就保持启用；一条都不启用才停用', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const make = async (name: string) =>
        (
          await app.inject({
            method: 'POST',
            url: '/api/discoveries',
            payload: {
              groupId: group.id,
              name,
              kind: 'rsshub',
              target: '/example',
              cronExpression: '0 * * * *',
            },
          })
        ).json()
      const first = await make('D1')
      const second = await make('D2')

      const groupEnabled = async () =>
        (await app.inject({ method: 'GET', url: `/api/groups/${group.id}` })).json().enabled
      expect(await groupEnabled()).toBe(true)

      // 只关掉一条：另一条还开着，分组保持启用
      await app.inject({
        method: 'PATCH',
        url: `/api/discoveries/${first.id}`,
        payload: { enabled: false },
      })
      expect(await groupEnabled()).toBe(true)

      // 两条都关掉：分组才跟着停用
      await app.inject({
        method: 'PATCH',
        url: `/api/discoveries/${second.id}`,
        payload: { enabled: false },
      })
      expect(await groupEnabled()).toBe(false)

      // 只要有一条转启用，分组就启用
      await app.inject({
        method: 'PATCH',
        url: `/api/discoveries/${second.id}`,
        payload: { enabled: true },
      })
      expect(await groupEnabled()).toBe(true)

      // 打开一条只把分组开关带起来，不替别的卡片做主
      const rows = (await app.inject({ method: 'GET', url: '/api/discoveries' })).json() as {
        id: string
        enabled: boolean
      }[]
      expect(rows).toHaveLength(2)
      const byId = new Map(rows.map((row) => [row.id, row.enabled]))
      expect(byId.get(first.id)).toBe(false)
      expect(byId.get(second.id)).toBe(true)
    } finally {
      await cleanup()
    }
  })
})
