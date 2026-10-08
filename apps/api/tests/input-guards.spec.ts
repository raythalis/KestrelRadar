import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

type App = Awaited<ReturnType<typeof createTestApp>>['app']

async function setup() {
  const { app, cleanup } = await createTestApp()
  const group = (
    await app.inject({ method: 'POST', url: '/api/groups', payload: { name: 'G' } })
  ).json()
  return { app, cleanup, group }
}

const post = (app: App, url: string, payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url, payload })

describe('写入口的可信边界', () => {
  it('发现：rss 的目标必须是 http(s) 地址，写进去的值两边不留空格', async () => {
    const { app, cleanup, group } = await setup()
    try {
      const bad = await post(app, '/api/discoveries', {
        groupId: group.id,
        name: '源',
        kind: 'rss',
        target: 'example.com/feed.xml',
        cronExpression: '0 * * * *',
      })
      expect(bad.statusCode).toBe(400)
      expect(bad.json().error.message).toContain('http')

      const ok = await post(app, '/api/discoveries', {
        groupId: group.id,
        name: '  源  ',
        kind: 'rss',
        target: '  https://example.com/feed.xml  ',
        cronExpression: '0 * * * *',
      })
      expect(ok.statusCode).toBe(201)
      expect(ok.json()).toMatchObject({ name: '源', target: 'https://example.com/feed.xml' })
    } finally {
      await cleanup()
    }
  })

  it('发现：rsshub 认相对路由，cron 不合法照样挡', async () => {
    const { app, cleanup, group } = await setup()
    try {
      const relative = await post(app, '/api/discoveries', {
        groupId: group.id,
        name: '少数派',
        kind: 'rsshub',
        target: '/sspai/matrix',
        cronExpression: '*/30 * * * *',
      })
      expect(relative.statusCode).toBe(201)

      const badCron = await post(app, '/api/discoveries', {
        groupId: group.id,
        name: '源',
        kind: 'rsshub',
        target: '/sspai/matrix',
        cronExpression: '99 99 * * *',
      })
      expect(badCron.statusCode).toBe(400)
      expect(badCron.json().error.message).toContain('定时')
    } finally {
      await cleanup()
    }
  })

  it('动作：汇总动作必须带合法 cron，即时动作不用', async () => {
    const { app, cleanup, group } = await setup()
    try {
      const channel = (
        await post(app, '/api/channels', {
          name: '钩子',
          type: 'webhook',
          config: { url: 'https://a.example/hook' },
        })
      ).json()

      const missing = await post(app, '/api/actions', {
        groupId: group.id,
        name: '汇总',
        triggerType: 'digest',
        channelId: channel.id,
        cronExpression: null,
      })
      expect(missing.statusCode).toBe(400)
      expect(missing.json().error.message).toContain('汇总时间')

      const bad = await post(app, '/api/actions', {
        groupId: group.id,
        name: '汇总',
        triggerType: 'digest',
        channelId: channel.id,
        cronExpression: '@daily',
      })
      expect(bad.statusCode).toBe(400)

      const ok = await post(app, '/api/actions', {
        groupId: group.id,
        name: '汇总',
        triggerType: 'digest',
        channelId: channel.id,
        cronExpression: '0 9 * * *',
      })
      expect(ok.statusCode).toBe(201)

      const instant = await post(app, '/api/actions', {
        groupId: group.id,
        name: '即时',
        triggerType: 'instant',
        channelId: channel.id,
        cronExpression: null,
      })
      expect(instant.statusCode).toBe(201)
    } finally {
      await cleanup()
    }
  })

  it('模板：名称与正文去掉两边空格，纯空白的名子写不进去', async () => {
    const { app, cleanup } = await setup()
    try {
      const blank = await post(app, '/api/templates', { name: '   ', content: '{{title}}' })
      expect(blank.statusCode).toBe(400)

      const ok = await post(app, '/api/templates', {
        name: '  我的模板  ',
        content: '\n  {{title}}  \n',
      })
      expect(ok.statusCode).toBe(201)
      expect(ok.json()).toMatchObject({ name: '我的模板', content: '{{title}}' })
    } finally {
      await cleanup()
    }
  })

  it('渠道：webhook 要合法地址，telegram 要 chat id 与 token', async () => {
    const { app, cleanup } = await setup()
    try {
      const badUrl = await post(app, '/api/channels', {
        name: '钩子',
        type: 'webhook',
        config: { url: 'a.example/hook' },
      })
      expect(badUrl.statusCode).toBe(400)
      expect(badUrl.json().error.message).toContain('http')

      const noChat = await post(app, '/api/channels', {
        name: 'TG',
        type: 'telegram',
        config: {},
        secret: '999:xyz',
      })
      expect(noChat.statusCode).toBe(400)
      expect(noChat.json().error.message).toContain('chat id')

      const noToken = await post(app, '/api/channels', {
        name: 'TG',
        type: 'telegram',
        config: { chatId: '42' },
      })
      expect(noToken.statusCode).toBe(400)
      expect(noToken.json().error.message).toContain('bot token')

      const ok = await post(app, '/api/channels', {
        name: '  TG  ',
        type: 'telegram',
        config: { chatId: ' 42 ' },
        secret: '999:xyz',
      })
      expect(ok.statusCode).toBe(201)
      expect(ok.json()).toMatchObject({ name: 'TG', config: { chatId: '42' } })
    } finally {
      await cleanup()
    }
  })
})
