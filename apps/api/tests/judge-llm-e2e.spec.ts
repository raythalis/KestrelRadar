import { createServer } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { openDatabase } from '../src/db/index.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb } from './helpers/temp-db.ts'

/** 一个 OpenAI 兼容的假供应商：名单里的模型一律 503，其余正常回答 yes；记下每次请求 */
async function startLlmServer(failing: string[]) {
  const calls: { model: string; authorization: string | undefined }[] = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      const body = JSON.parse(raw || '{}') as { model?: string }
      const model = body.model ?? ''
      calls.push({ model, authorization: req.headers.authorization })
      if (failing.includes(model)) {
        res.writeHead(503, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { message: '模型不可用' } }))
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          choices: [{ message: { content: '{"decision":"yes","reason":"模型说可以"}' } }],
        }),
      )
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    calls,
    stop: () => new Promise<void>((done) => server.close(() => done())),
  }
}

let feed: FeedServer
let cleanupDb: () => void
const logs: string[] = []

function build(): Container {
  return buildContainer(openDatabase(createTempDb().path), {
    log: (_level, message) => logs.push(message),
  })
}

beforeEach(async () => {
  logs.length = 0
  const db = createTempDb()
  cleanupDb = db.cleanup
  feed = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
})

afterEach(async () => {
  await feed.stop()
  cleanupDb()
})

/** 灰区内容：两条标题都当作关键词，命中一部分 → 落在灰区，LLM+ 下必须走模型 */
function seed(container: Container) {
  const group = container.groups.create({ name: 'G', description: '', enabled: true })
  const discovery = container.discoveries.create({
    groupId: group.id,
    name: '源',
    kind: 'rss',
    target: `${feed.baseUrl}/rss`,
    cronExpression: '0 * * * *',
    enabled: true,
  })
  const monitor = container.monitors.create({
    groupId: group.id,
    name: '监听',
    mode: 'algorithm_llm',
    sensitivity: 'medium',
    matchMode: 'any',
    intentText: '',
    includeKeywords: ['第一篇文章', '第二篇文章', '第三篇文章'],
    excludeKeywords: [],
    useGlobalExcludes: false,
    enabled: true,
    actionIds: [],
  })
  return { group, discovery, monitor }
}

describe('LLM+ 真调模型：顺序、重试与兜底（走真实 HTTP）', () => {
  it('第一个模型不通：先在它身上试完，再自动换下一个，结论照常落库', async () => {
    const llmServer = await startLlmServer(['broken-model'])
    const container = build()
    const provider = container.modelProviders.createProvider({
      name: '假供应商',
      kind: 'openai_compatible',
      baseUrl: llmServer.baseUrl,
      apiKey: 'sk-e2e',
      enabled: true,
      sortOrder: 0,
    })
    const broken = container.modelProviders.addModel(provider.id, {
      modelName: 'broken-model',
      enabled: true,
      sortOrder: 0,
    })
    const good = container.modelProviders.addModel(provider.id, {
      modelName: 'good-model',
      enabled: true,
      sortOrder: 1,
    })
    container.settings.update({
      judgeMode: 'algorithm_llm',
      judgeModelOrder: [broken.id, good.id],
      llmMaxRetries: 0,
      llmTimeoutSeconds: 10,
    })

    const { discovery, monitor } = seed(container)
    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    const reviewed = judgments.filter((item) => item.layer === 'llm')
    expect(reviewed.length).toBeGreaterThan(0)
    expect(reviewed[0]?.decision).toBe('pass')
    expect(reviewed[0]?.llmReason).toBe('模型说可以')

    // 真实请求：先打在第一个模型上，换过去之后就是第二个模型
    expect(llmServer.calls[0]?.model).toBe('broken-model')
    expect(llmServer.calls[0]?.authorization).toBe('Bearer sk-e2e')
    expect(llmServer.calls.some((call) => call.model === 'good-model')).toBe(true)
    expect(logs.some((line) => line.includes('broken-model'))).toBe(true)

    // 兜底没被触发：顺序内部就解决了，不记异常
    expect(container.incidents.listAll().filter((item) => item.kind === 'judgment')).toHaveLength(0)

    await llmServer.stop()
  })

  it('顺序全试完还是不通：记异常，并按降级开关放行（兜底）', async () => {
    const llmServer = await startLlmServer(['a-model', 'b-model'])
    const container = build()
    const provider = container.modelProviders.createProvider({
      name: '假供应商',
      kind: 'openai_compatible',
      baseUrl: llmServer.baseUrl,
      enabled: true,
      sortOrder: 0,
    })
    const a = container.modelProviders.addModel(provider.id, {
      modelName: 'a-model',
      enabled: true,
      sortOrder: 0,
    })
    const b = container.modelProviders.addModel(provider.id, {
      modelName: 'b-model',
      enabled: true,
      sortOrder: 1,
    })
    container.settings.update({
      judgeMode: 'algorithm_llm',
      judgeModelOrder: [a.id, b.id],
      llmMaxRetries: 0,
      llmTimeoutSeconds: 10,
    })

    const { discovery, monitor } = seed(container)
    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    expect(judgments.length).toBeGreaterThan(0)
    expect(judgments.every((item) => item.layer !== 'llm')).toBe(true)
    expect(judgments[0]?.reasons.join(' ')).toContain('降级')

    const incidents = container.incidents.listAll().filter((item) => item.kind === 'judgment')
    expect(incidents.length).toBeGreaterThan(0)
    expect(incidents[0]?.code).toBe('llm.failed')

    // 两个模型都真被请求过（顺序走完了才认输）
    expect([...new Set(llmServer.calls.map((call) => call.model))].sort()).toEqual([
      'a-model',
      'b-model',
    ])

    await llmServer.stop()
  })

  it('顺序是空的：等价于以前「还没配模型」，记 llm.unavailable 并降级', async () => {
    const container = build()
    container.settings.update({ judgeMode: 'algorithm_llm', judgeModelOrder: [] })

    const { discovery, monitor } = seed(container)
    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    expect(judgments.length).toBeGreaterThan(0)
    expect(judgments[0]?.reasons.join(' ')).toContain('降级')

    const incidents = container.incidents.listAll().filter((item) => item.kind === 'judgment')
    expect(incidents.length).toBeGreaterThan(0)
    expect(incidents[0]?.code).toBe('llm.unavailable')
  })
})
