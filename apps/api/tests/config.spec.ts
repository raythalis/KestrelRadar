import { SETTINGS_DEFAULTS } from '@kestrel/contracts'

import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('配置快照接口', () => {
  it('一次返回全部配置，且不含任何密钥明文', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      await app.inject({
        method: 'POST',
        url: '/api/channels',
        payload: { name: 'tg', type: 'telegram', config: { chatId: '1' }, secret: 'token-secret' },
      })
      await app.inject({
        method: 'POST',
        url: '/api/model-providers',
        payload: {
          name: 'P',
          kind: 'openai_compatible',
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'sk-secret',
        },
      })
      await app.inject({
        method: 'POST',
        url: '/api/discoveries',
        payload: {
          groupId: group.id,
          name: 'D',
          kind: 'rsshub',
          target: 'https://rsshub.example.com/github/trending/daily',
          cronExpression: '0 * * * *',
        },
      })

      const res = await app.inject({ method: 'GET', url: '/api/config' })
      expect(res.statusCode).toBe(200)
      const snapshot = res.json()
      expect(snapshot.groups).toHaveLength(1)
      expect(snapshot.discoveries).toHaveLength(1)
      expect(snapshot.channels).toHaveLength(1)
      expect(snapshot.modelProviders).toHaveLength(1)
      expect(snapshot.monitors).toEqual([])
      expect(snapshot.actions).toEqual([])
      expect(snapshot.models).toEqual([])
      // 内置模板始终在快照里，供动作选择
      expect(snapshot.templates.map((item: { builtin: boolean }) => item.builtin)).toEqual([
        true,
        true,
      ])
      expect(snapshot.settings.concurrency).toBe(SETTINGS_DEFAULTS.concurrency)
      // 卡片上带下次采集时间（由调度器算出来，不入库）
      expect(typeof snapshot.discoveries[0].nextRunAt).toBe('string')
      expect(snapshot.discoveries[0]).not.toHaveProperty('hasAccessKey')
      expect(res.body).not.toContain('token-secret')
      expect(res.body).not.toContain('sk-secret')
    } finally {
      await cleanup()
    }
  })
})
