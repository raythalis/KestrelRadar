import type { Channel } from '@kestrel/contracts'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { openDatabase } from '../src/db/index.ts'
import { createDeliverySender } from '../src/modules/delivery/dispatcher.ts'
import { DeliveryError, createWebhookSender } from '../src/modules/delivery/sender.ts'
import { createTelegramGateway } from '../src/modules/delivery/telegram.ts'
import { createTempDb } from './helpers/temp-db.ts'
import { createTestApp } from './helpers/test-app.ts'

interface Call {
  url: string
  body: Record<string, unknown>
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

function fakeFetch(calls: Call[], payloads: unknown[], status = 200): typeof fetch {
  let index = 0
  return (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) })
    const payload = payloads[Math.min(index, payloads.length - 1)]
    index += 1
    return jsonResponse(payload, status)
  }) as unknown as typeof fetch
}

function channel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 'c1',
    name: 'test group',
    type: 'telegram',
    config: { chatId: '-100123' },
    hasSecret: true,
    enabled: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

const message = {
  channel: channel(),
  secret: '123:abc',
  text: '\u6b63\u6587',
  title: '\u6807\u9898',
  url: null,
  sourceCount: 1,
  eventCount: 1,
  hitAt: null,
}

describe('Telegram 渠道', () => {
  it('发消息打到 sendMessage，带上 chat id 与正文', async () => {
    const calls: Call[] = []
    const gateway = createTelegramGateway({
      fetchImpl: fakeFetch(calls, [{ ok: true, result: {} }]),
    })
    await gateway.send(message)

    expect(calls[0]?.url).toBe('https://api.telegram.org/bot123:abc/sendMessage')
    expect(calls[0]?.body.chat_id).toBe('-100123')
    expect(calls[0]?.body.text).toBe('\u6b63\u6587')
  })

  it('没 token 或没 chat id 直接报错，不去打接口', async () => {
    const calls: Call[] = []
    const gateway = createTelegramGateway({ fetchImpl: fakeFetch(calls, [{ ok: true }]) })

    await expect(gateway.send({ ...message, secret: null })).rejects.toThrow(/bot token/)
    await expect(gateway.send({ ...message, channel: channel({ config: {} }) })).rejects.toThrow(
      /chat id/,
    )
    expect(calls).toHaveLength(0)
  })

  it('Telegram 拒绝时把它的原话带出来', async () => {
    const gateway = createTelegramGateway({
      fetchImpl: fakeFetch([], [{ ok: false, description: 'Bad Request: chat not found' }]),
    })
    await expect(gateway.send(message)).rejects.toThrow(/chat not found/)
  })

  it('读取会话：去重，群聊取群名、私聊取人名', async () => {
    const gateway = createTelegramGateway({
      fetchImpl: fakeFetch(
        [],
        [
          {
            ok: true,
            result: [
              { message: { chat: { id: -1001, title: 'family' } } },
              { message: { chat: { id: 555, first_name: 'Ray', username: 'ray' } } },
              { channel_post: { chat: { id: -1001, title: 'family' } } },
            ],
          },
        ],
      ),
    })

    expect(await gateway.listChats('123:abc')).toEqual([
      { id: '-1001', title: 'family' },
      { id: '555', title: 'Ray ray' },
    ])
  })

  it('没填 token 时提醒先填', async () => {
    const gateway = createTelegramGateway({ fetchImpl: fakeFetch([], [{ ok: true }]) })
    await expect(gateway.listChats('   ')).rejects.toThrow(/\u5148\u586b bot token/)
  })
})

describe('发送分发', () => {
  it('按渠道类型挑发送器：telegram 打 Telegram，webhook 打地址', async () => {
    const calls: Call[] = []
    const sender = createDeliverySender({
      fetchImpl: fakeFetch(calls, [{ ok: true, result: {} }, { ok: true }]),
    })

    await sender.send(message)
    await sender.send({
      ...message,
      channel: channel({ type: 'webhook', config: { url: 'https://hook.example.com/x' } }),
    })

    expect(calls[0]?.url).toContain('api.telegram.org')
    expect(calls[1]?.url).toBe('https://hook.example.com/x')
  })

  it('Webhook 收到非 2xx 算失败', async () => {
    const sender = createWebhookSender({
      fetchImpl: (async () => jsonResponse({}, 500)) as unknown as typeof fetch,
    })
    await expect(
      sender.send({
        ...message,
        channel: channel({ type: 'webhook', config: { url: 'https://hook.example.com/x' } }),
      }),
    ).rejects.toThrow(/500/)
  })
})

describe('读取会话走服务层', () => {
  let cleanup: () => void
  let container: Container
  let calls: Call[]

  beforeEach(() => {
    const db = createTempDb()
    cleanup = db.cleanup
    calls = []
    container = buildContainer(openDatabase(db.path), {
      telegram: createTelegramGateway({
        fetchImpl: fakeFetch(calls, [
          { ok: true, result: [{ message: { chat: { id: 42, first_name: 'Ray' } } }] },
        ]),
      }),
    })
  })

  afterEach(() => cleanup())

  it('给渠道 id 时用库里存着的 token', async () => {
    const created = await container.channels.create({
      name: 'my tg',
      type: 'telegram',
      config: { chatId: '42' },
      secret: '999:xyz',
      enabled: true,
    })

    const result = await container.delivery.listTelegramChats({ channelId: created.id })
    expect(result).toMatchObject({ ok: true })
    expect(result.code).toBeUndefined()
    expect(result.data?.chats).toEqual([{ id: '42', title: 'Ray' }])
    expect(calls[0]?.url).toBe('https://api.telegram.org/bot999:xyz/getUpdates')
  })

  it('界面上刚填的 token 优先于库里的', async () => {
    const created = await container.channels.create({
      name: 'my tg',
      type: 'telegram',
      config: { chatId: '42' },
      secret: '999:xyz',
      enabled: true,
    })

    await container.delivery.listTelegramChats({ channelId: created.id, token: '111:new' })
    expect(calls[0]?.url).toBe('https://api.telegram.org/bot111:new/getUpdates')
  })

  it('既没 token 也没渠道：业务失败（AUTH_FAILED），不是抛错', async () => {
    const result = await container.delivery.listTelegramChats({})
    expect(result).toMatchObject({ ok: false, code: 'AUTH_FAILED' })
    expect(result.message).toContain('bot token')
  })
})

describe('读取会话接口', () => {
  const chats = [{ id: '-100', title: '家庭群' }]

  async function makeApp(gateway: ReturnType<typeof createTelegramGateway>) {
    return createTestApp(undefined, gateway)
  }

  it('给渠道 id：用库里存的 token，返回读到的会话', async () => {
    const calls: Call[] = []
    const gateway = createTelegramGateway({
      fetchImpl: fakeFetch(calls, [
        { ok: true, result: [{ message: { chat: { id: -100, title: '家庭群' } } }] },
      ]),
    })
    const { app, cleanup } = await makeApp(gateway)
    try {
      const created = (
        await app.inject({
          method: 'POST',
          url: '/api/channels',
          payload: {
            name: 'tg',
            type: 'telegram',
            config: { chatId: '-100' },
            secret: '999:xyz',
          },
        })
      ).json()

      const response = await app.inject({
        method: 'POST',
        url: '/api/channels/telegram/chats',
        payload: { channelId: created.id },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().data).toMatchObject({ ok: true })
      expect(response.json().data.code).toBeUndefined()
      expect(response.json().data.data.chats).toEqual(chats)
      expect(calls[0]?.url).toBe('https://api.telegram.org/bot999:xyz/getUpdates')
    } finally {
      await cleanup()
    }
  })

  it('token 不对：业务失败（200 + ok:false + AUTH_FAILED），不把堆栈丢出去', async () => {
    const gateway = createTelegramGateway({
      fetchImpl: fakeFetch([], [{ ok: false, description: 'Unauthorized' }], 401),
    })
    const { app, cleanup } = await makeApp(gateway)
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/channels/telegram/chats',
        payload: { token: 'bad-token' },
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data).toMatchObject({ ok: false, code: 'AUTH_FAILED' })
      expect(body.data.message).toContain('bot token 不对')
      // 细码只给日志与统计
      expect(body.data.details.reason).toBe('delivery.telegramAuth')
    } finally {
      await cleanup()
    }
  })

  it('token 不对：错误里留下对方的原始说法（语言无关，卡片副信息用它）', async () => {
    const gateway = createTelegramGateway({
      fetchImpl: fakeFetch([], [{ ok: false, description: 'Unauthorized' }], 401),
    })

    const failure = await gateway.send(message).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(DeliveryError)
    expect((failure as DeliveryError).code).toBe('delivery.telegramAuth')
    expect((failure as DeliveryError).detail).toBe('Unauthorized')
  })

  it('什么都没给：回 400 校验错', async () => {
    const { app, cleanup } = await makeApp(createTelegramGateway({ fetchImpl: fakeFetch([], []) }))
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/channels/telegram/chats',
        payload: {},
      })
      expect(response.statusCode).toBe(400)
      expect(response.json().error.code).toBe('VALIDATION_ERROR')
    } finally {
      await cleanup()
    }
  })
})
