import { SETTINGS_DEFAULTS } from '@kestrel/contracts'

import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('全局设置', () => {
  it('没改过时返回默认值', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/settings' })
      expect(res.statusCode).toBe(200)
      const settings = res.json()
      expect(settings.judgeMode).toBe('algorithm')
      expect(settings.concurrency).toBe(5)
      expect(settings.judgeMode).toBe(SETTINGS_DEFAULTS.judgeMode)
      expect(settings.freshnessWindowDays).toBe(SETTINGS_DEFAULTS.freshnessWindowDays)
    } finally {
      await cleanup()
    }
  })

  it('改过的值会被记住，删掉改动就回到默认', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const patched = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { concurrency: 9, globalExcludeKeywords: ['抽奖'] },
      })
      expect(patched.json().concurrency).toBe(9)
      expect(patched.json().globalExcludeKeywords).toEqual(['抽奖'])

      expect((await app.inject({ method: 'GET', url: '/api/settings' })).json().concurrency).toBe(9)

      const removed = await app.inject({ method: 'DELETE', url: '/api/settings/concurrency' })
      expect(removed.statusCode).toBe(200)
      expect(removed.json().concurrency).toBe(SETTINGS_DEFAULTS.concurrency)
    } finally {
      await cleanup()
    }
  })

  it('非法取值被拒绝', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { concurrency: 99 },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('validation_error')
    } finally {
      await cleanup()
    }
  })
})
