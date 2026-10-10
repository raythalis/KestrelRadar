import { describe, expect, it } from 'vitest'

import { createTestApp } from './helpers/test-app.ts'

describe('新增通知渠道入库', () => {
  it('企业微信、钉钉、飞书、邮件写入后按真实类型读取，密钥不出接口', async () => {
    const { app, cleanup } = await createTestApp()
    try {
      const entries = [
        {
          type: 'wecom',
          config: { url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test' },
        },
        {
          type: 'dingtalk',
          config: { url: 'https://oapi.dingtalk.com/robot/send?access_token=test', sign: 'true' },
          secret: 'test-sign-key',
        },
        { type: 'feishu', config: { url: 'https://open.feishu.cn/open-apis/bot/v2/hook/test' } },
        {
          type: 'email',
          config: {
            host: 'smtp.example.com',
            port: '465',
            secure: 'true',
            from: 'from@example.com',
            to: 'to@example.com',
            username: 'from@example.com',
          },
          secret: 'test-mail-password',
        },
      ]
      for (const entry of entries) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: { name: entry.type, enabled: true, ...entry },
        })
        expect(response.statusCode).toBe(201)
        expect(response.json().type).toBe(entry.type)
        expect(response.body).not.toContain(entry.secret ?? 'never-printed-secret')
        const read = await app.inject({ method: 'GET', url: `/api/channels/${response.json().id}` })
        expect(read.statusCode).toBe(200)
        expect(read.json().type).toBe(entry.type)
        expect(read.json().hasSecret).toBe(Boolean(entry.secret))
      }
    } finally {
      await cleanup()
    }
  })
})
