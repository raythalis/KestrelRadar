import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('模型供应商', () => {
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
})
