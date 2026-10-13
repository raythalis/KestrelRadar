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
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
    } finally {
      await cleanup()
    }
  })

  it('改时区后定时任务立刻重排：卡片上的下次采集时间跟着变', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const group = (
        await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
      ).json()
      const discovery = (
        await app.inject({
          method: 'POST',
          url: '/api/discoveries',
          payload: {
            groupId: group.id,
            name: '源',
            kind: 'rss',
            target: 'https://example.com/rss',
            cronExpression: '0 19 * * *',
          },
        })
      ).json()

      await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        payload: { timezone: 'Asia/Shanghai' },
      })
      const shanghai = (
        await app.inject({ method: 'GET', url: `/api/discoveries/${discovery.id}` })
      ).json().nextRunAt

      await app.inject({ method: 'PATCH', url: '/api/settings', payload: { timezone: 'UTC' } })
      const utc = (
        await app.inject({ method: 'GET', url: `/api/discoveries/${discovery.id}` })
      ).json().nextRunAt

      // 北京 19:00 = 11:00Z；UTC 下同一表达式就是 19:00Z
      expect(shanghai).toMatch(/T11:00:00\.000Z$/)
      expect(utc).toMatch(/T19:00:00\.000Z$/)

      // 删掉改动回到默认（system）；容器里进程时区就是 UTC，所以数值与上面那条相同
      await app.inject({ method: 'DELETE', url: '/api/settings/timezone' })
      expect((await app.inject({ method: 'GET', url: '/api/settings' })).json().timezone).toBe(
        'system',
      )
      const fallback = (
        await app.inject({ method: 'GET', url: `/api/discoveries/${discovery.id}` })
      ).json().nextRunAt
      expect(fallback).toBeTruthy()
    } finally {
      await cleanup()
    }
  })
})
