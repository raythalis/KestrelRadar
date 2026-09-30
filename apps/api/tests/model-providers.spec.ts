import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('模型供应商与模型清单', () => {
  it('密钥不回显，只给 hasApiKey', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/model-providers',
        payload: {
          name: '本地 Ollama',
          kind: 'ollama',
          baseUrl: 'http://127.0.0.1:11434',
          apiKey: 'sk-abc',
        },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().hasApiKey).toBe(true)
      expect(res.body).not.toContain('sk-abc')
    } finally {
      await cleanup()
    }
  })

  it('同一供应商下模型不允许重名，删除供应商会带走它的模型', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const provider = (
        await app.inject({
          method: 'POST',
          url: '/api/model-providers',
          payload: { name: 'P', kind: 'openai_compatible', baseUrl: 'https://api.example.com/v1' },
        })
      ).json()

      const model = await app.inject({
        method: 'POST',
        url: `/api/model-providers/${provider.id}/models`,
        payload: { modelName: 'gpt-x', sortOrder: 1 },
      })
      expect(model.statusCode).toBe(201)

      const duplicate = await app.inject({
        method: 'POST',
        url: `/api/model-providers/${provider.id}/models`,
        payload: { modelName: 'gpt-x' },
      })
      expect(duplicate.statusCode).toBe(409)

      const patched = await app.inject({
        method: 'PATCH',
        url: `/api/models/${model.json().id}`,
        payload: { enabled: false, sortOrder: 3 },
      })
      expect(patched.json()).toMatchObject({ enabled: false, sortOrder: 3 })

      await app.inject({ method: 'DELETE', url: `/api/model-providers/${provider.id}` })
      expect((await app.inject({ method: 'GET', url: '/api/models' })).json()).toHaveLength(0)
    } finally {
      await cleanup()
    }
  })
})
