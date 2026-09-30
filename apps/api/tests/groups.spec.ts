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
      expect(gone.json().error.code).toBe('not_found')
    } finally {
      await cleanup()
    }
  })

  it('名称为空时拒绝，并给出 validation_error', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({ method: 'POST', url: '/api/groups', payload: { name: '' } })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('validation_error')
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
})
