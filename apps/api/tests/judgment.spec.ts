import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { openDatabase } from '../src/db/index.ts'
import type { JudgeLlm } from '../src/modules/judgment/llm.ts'
import { RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'
import { startFeedServer, type FeedServer } from './helpers/feed-server.ts'
import { createTempDb } from './helpers/temp-db.ts'

let server: FeedServer
let cleanupDb: () => void
const logs: string[] = []

function build(llm?: JudgeLlm): Container {
  return buildContainer(openDatabase(createTempDb().path), {
    log: (_level, message) => logs.push(message),
    llm,
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(async () => {
  logs.length = 0
  const db = createTempDb()
  cleanupDb = db.cleanup
  server = await startFeedServer({ '/rss': { body: RSS_TWO_ITEMS } })
})

afterEach(async () => {
  await server.stop()
  cleanupDb()
})

function seed(container: Container, monitorOverrides: Record<string, unknown> = {}) {
  const group = container.groups.create({ name: 'G', description: '', enabled: true })
  const discovery = container.discoveries.create({
    groupId: group.id,
    name: '源',
    kind: 'rss',
    target: `${server.baseUrl}/rss`,
    cronExpression: '0 * * * *',
    enabled: true,
  })
  const monitor = container.monitors.create({
    groupId: group.id,
    name: '监听',
    mode: 'algorithm',
    sensitivity: 'medium',
    matchMode: 'any',
    intentText: '',
    // 夹具里的两篇文章标题都带「文章」两个字
    includeKeywords: ['文章'],
    excludeKeywords: [],
    useGlobalExcludes: false,
    enabled: true,
    actionIds: [],
    ...monitorOverrides,
  })
  return { group, discovery, monitor }
}

describe('判定落库', () => {
  it('采集完自动判定：每条内容都有一条判定记录，带分数与理由', async () => {
    const container = build()
    const { discovery, monitor } = seed(container)

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    expect(judgments).toHaveLength(2)
    for (const judgment of judgments) {
      expect(['pass', 'drop']).toContain(judgment.decision)
      expect(judgment.reasons.length).toBeGreaterThan(0)
    }
    expect(judgments.some((item) => item.decision === 'pass')).toBe(true)
  })

  it('再采集一遍不会重复判定（幂等）', async () => {
    const container = build()
    const { discovery, monitor } = seed(container)
    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)
    const before = container.judgments.listByMonitor(monitor.id).length

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    expect(container.judgments.listByMonitor(monitor.id)).toHaveLength(before)
  })

  it('停用的监听不参与判定', async () => {
    const container = build()
    const { discovery, monitor } = seed(container, { enabled: false })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    expect(container.judgments.listByMonitor(monitor.id)).toHaveLength(0)
  })

  it('命中排除词的内容判为丢掉，理由写明是哪个词', async () => {
    const container = build()
    // 排除词只盖住第二篇，第一篇照常过：排除词是逐条判的
    const { discovery, monitor } = seed(container, { excludeKeywords: ['第二篇'] })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    const dropped = judgments.filter((item) => item.decision === 'drop')
    expect(dropped).toHaveLength(1)
    expect(dropped[0]?.layer).toBe('excludes')
    expect(dropped[0]?.reasons.join(' ')).toContain('第二篇')
    expect(judgments.filter((item) => item.decision === 'pass')).toHaveLength(1)
  })

  it('勾了追加全局排除词就会带上全局词', async () => {
    const container = build()
    container.settings.update({ globalExcludeKeywords: ['第二篇'] })
    const { discovery, monitor } = seed(container, { useGlobalExcludes: true })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    expect(judgments.filter((item) => item.decision === 'drop')).toHaveLength(1)
    expect(judgments.find((item) => item.decision === 'drop')?.layer).toBe('excludes')
  })

  it('没勾追加全局排除词时，全局词不参与判定', async () => {
    const container = build()
    container.settings.update({ globalExcludeKeywords: ['第二篇'] })
    const { discovery, monitor } = seed(container, { useGlobalExcludes: false })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    expect(
      container.judgments.listByMonitor(monitor.id).every((item) => item.decision === 'pass'),
    ).toBe(true)
  })
})

describe('LLM 只做灰区复核（接口先留好）', () => {
  const grayContent = {
    includeKeywords: ['第一篇文章', '第二篇文章', '第三篇文章'],
  }

  it('灰区交给模型：模型说否就丢掉，并记下模型给的理由', async () => {
    const llm: JudgeLlm = {
      review: async () => ({ decision: 'no', reason: '讲的是别的事' }),
    }
    const container = build(llm)
    const { discovery, monitor } = seed(container, { mode: 'algorithm_llm', ...grayContent })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    expect(judgments.length).toBeGreaterThan(0)
    const reviewed = judgments.filter((item) => item.layer === 'llm')
    expect(reviewed.length).toBeGreaterThan(0)
    expect(reviewed[0]?.decision).toBe('drop')
    expect(reviewed[0]?.llmReason).toContain('别的事')
  })

  it('模型挂了 + 降级开关：回到纯算法保守放行，并说明降级了', async () => {
    const llm: JudgeLlm = {
      review: async () => {
        throw new Error('模型不通')
      },
    }
    const container = build(llm)
    const { discovery, monitor } = seed(container, { mode: 'algorithm_llm', ...grayContent })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    const judgments = container.judgments.listByMonitor(monitor.id)
    expect(judgments.length).toBeGreaterThan(0)
    expect(judgments.every((item) => item.decision === 'pass')).toBe(true)
    expect(judgments[0]?.reasons.join(' ')).toContain('降级')
  })

  it('模型挂了 + 直接报错：这条不落判定，等下次再判，也不打断采集', async () => {
    const llm: JudgeLlm = {
      review: async () => {
        throw new Error('模型不通')
      },
    }
    const container = build(llm)
    container.settings.update({ llmFallbackMode: 'error' })
    const { discovery, monitor } = seed(container, { mode: 'algorithm_llm', ...grayContent })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    expect(container.judgments.listByMonitor(monitor.id)).toHaveLength(0)
    expect(logs.join(' ')).toContain('模型')
  })

  it('写了意图描述：过门槛的内容都让模型读一遍（不只是灰区）', async () => {
    const asked: string[] = []
    const llm: JudgeLlm = {
      review: async (input) => {
        asked.push(input.intentText)
        return { decision: 'yes', reason: '就是这件事' }
      },
    }
    const container = build(llm)
    const { discovery, monitor } = seed(container, {
      mode: 'algorithm_llm',
      intentText: '新发布的模型',
      includeKeywords: ['文章'],
    })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    expect(asked.length).toBe(2)
    expect(asked.every((text) => text === '新发布的模型')).toBe(true)
    expect(
      container.judgments.listByMonitor(monitor.id).every((item) => item.layer === 'llm'),
    ).toBe(true)
  })

  it('纯算法模式下，写了意图描述也不调模型', async () => {
    let called = 0
    const llm: JudgeLlm = {
      review: async () => {
        called += 1
        return { decision: 'no', reason: '不该被调用' }
      },
    }
    const container = build(llm)
    const { discovery } = seed(container, { mode: 'algorithm', intentText: '随便写点什么' })

    await container.collector.collectDiscovery(discovery.id)
    await container.judge.judgePendingItems(discovery.id)

    expect(called).toBe(0)
    await sleep(10)
  })
})
