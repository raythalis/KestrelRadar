import { describe, expect, it } from 'vitest'

import {
  createProviderLlm,
  parseLlmAnswer,
  type LlmTarget,
} from '../src/modules/judgment/llm-client.ts'
import { JudgeLlmUnavailableError } from '../src/modules/judgment/llm.ts'

const OLLAMA: LlmTarget = {
  modelId: 'm1',
  modelName: 'qwen3:8b',
  providerName: '本机 Ollama',
  baseUrl: 'http://127.0.0.1:11434',
  apiKey: null,
}

const CLOUD: LlmTarget = {
  modelId: 'm2',
  modelName: 'deepseek-chat',
  providerName: 'DeepSeek 官方',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: 'sk-test',
}

const INPUT = { intentText: '', title: '标题', summary: '摘要', mode: 'gray_review' as const }

function answer(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response
}

function failed(status = 500): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response
}

/** 永远不返回，只在被掐断时 reject —— 模拟单次请求超时 */
function hanging(): Promise<Response> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error('aborted')), 5)
  })
}

/** 按脚本依次给答复的假 fetch，同时把每次请求记下来 */
function scripted(replies: (() => Response | Promise<Response>)[]) {
  const calls: { url: string; model: string; authorization: string | undefined }[] = []
  let index = 0
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>
    const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string }
    calls.push({ url: String(url), model: body.model ?? '', authorization: headers.authorization })
    const reply = replies[Math.min(index, replies.length - 1)]!
    index += 1
    return reply()
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

describe('createProviderLlm', () => {
  it('顺序里第一个就能用：只调一次，地址 / 模型名 / 鉴权都对', async () => {
    const { fetchImpl, calls } = scripted([() => answer('{"decision":"yes","reason":"相关"}')])
    const llm = createProviderLlm({
      targets: () => [CLOUD, OLLAMA],
      timeoutSeconds: () => 5,
      maxRetries: () => 1,
      fetchImpl,
    })

    const result = await llm.review(INPUT)
    expect(result).toEqual({ decision: 'yes', reason: '相关' })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://api.deepseek.com/v1/chat/completions')
    expect(calls[0]?.model).toBe('deepseek-chat')
    expect(calls[0]?.authorization).toBe('Bearer sk-test')
  })

  it('没有密钥的供应商不带鉴权头，地址没写 /v1 时自动补上', async () => {
    const { fetchImpl, calls } = scripted([() => answer('{"decision":"no","reason":"无关"}')])
    const llm = createProviderLlm({
      targets: () => [OLLAMA],
      timeoutSeconds: () => 5,
      maxRetries: () => 0,
      fetchImpl,
    })

    expect((await llm.review(INPUT)).decision).toBe('no')
    expect(calls[0]?.url).toBe('http://127.0.0.1:11434/v1/chat/completions')
    expect(calls[0]?.authorization).toBeUndefined()
  })

  it('单个模型重试用满才换下一个：A 两次不通 → 轮到 B', async () => {
    const { fetchImpl, calls } = scripted([
      () => failed(),
      () => failed(502),
      () => answer('{"decision":"yes","reason":"第二个模型通了"}'),
    ])
    const llm = createProviderLlm({
      targets: () => [OLLAMA, CLOUD],
      timeoutSeconds: () => 5,
      maxRetries: () => 1,
      fetchImpl,
    })

    const result = await llm.review(INPUT)
    expect(result.reason).toBe('第二个模型通了')
    expect(calls.map((call) => call.model)).toEqual(['qwen3:8b', 'qwen3:8b', 'deepseek-chat'])
  })

  it('单次请求超时就掐断，算这个模型失败，接着换下一个', async () => {
    const { fetchImpl, calls } = scripted([
      () => hanging(),
      () => answer('{"decision":"yes","reason":"备用的通了"}'),
    ])
    const llm = createProviderLlm({
      targets: () => [OLLAMA, CLOUD],
      timeoutSeconds: () => 0.05,
      maxRetries: () => 0,
      fetchImpl,
    })

    expect((await llm.review(INPUT)).reason).toBe('备用的通了')
    expect(calls.map((call) => call.model)).toEqual(['qwen3:8b', 'deepseek-chat'])
  })

  it('顺序全试完还是不通：抛出错误，交给上层的兜底开关', async () => {
    const { fetchImpl, calls } = scripted([() => failed(503)])
    const llm = createProviderLlm({
      targets: () => [OLLAMA, CLOUD],
      timeoutSeconds: () => 5,
      maxRetries: () => 0,
      fetchImpl,
    })

    await expect(llm.review(INPUT)).rejects.toThrow('HTTP 503')
    expect(calls).toHaveLength(2)
  })

  it('顺序是空的：报「还没有配置可用的判定模型」', async () => {
    const llm = createProviderLlm({
      targets: () => [],
      timeoutSeconds: () => 5,
      maxRetries: () => 0,
      fetchImpl: scripted([]).fetchImpl,
    })

    await expect(llm.review(INPUT)).rejects.toBeInstanceOf(JudgeLlmUnavailableError)
  })
})

describe('parseLlmAnswer', () => {
  it('模型回话里带解释或代码块围栏也能抠出结论', () => {
    expect(
      parseLlmAnswer('好的，结论如下：\n```json\n{"decision":"Yes","reason":"标题相关"}\n```'),
    ).toEqual({
      decision: 'yes',
      reason: '标题相关',
    })
  })

  it('没有结论就报错（当成这个模型失败）', () => {
    expect(() => parseLlmAnswer('我不确定')).toThrow()
    expect(() => parseLlmAnswer('{"decision":"maybe"}')).toThrow()
  })
})
