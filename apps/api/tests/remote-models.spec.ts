import { describe, expect, it } from 'vitest'

import { createRemoteModels } from '../src/modules/model-providers/remote-models.ts'

function provider(baseUrl: string) {
  return {
    id: 'p1',
    name: 'P',
    kind: 'openai_compatible' as const,
    baseUrl,
    hasApiKey: true,
    enabled: true,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('问供应商要模型清单', () => {
  it('地址带不带 /v1 都拼同一个接口，把密钥带上，重名去重、按名字排序', async () => {
    const seen: { url: string; authorization?: string }[] = []
    const remote = createRemoteModels({
      timeoutMs: () => 1000,
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen.push({
          url: String(url),
          authorization: (init.headers as Record<string, string> | undefined)?.authorization,
        })
        return new Response(
          JSON.stringify({ data: [{ id: 'b-model' }, { id: 'a-model' }, { id: 'b-model' }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }) as typeof fetch,
    })

    await expect(remote.list(provider('http://127.0.0.1:11434'), 'sk-x')).resolves.toEqual([
      'a-model',
      'b-model',
    ])
    await expect(remote.list(provider('https://api.example.com/v1'), null)).resolves.toEqual([
      'a-model',
      'b-model',
    ])

    expect(seen[0]?.url).toBe('http://127.0.0.1:11434/v1/models')
    expect(seen[0]?.authorization).toBe('Bearer sk-x')
    expect(seen[1]?.url).toBe('https://api.example.com/v1/models')
    expect(seen[1]?.authorization).toBeUndefined()
  })

  it('问不到就静默给空数组：报错、非 200、格式不对都算拿不到', async () => {
    const remote = createRemoteModels({
      timeoutMs: () => 1000,
      fetchImpl: (async () => {
        throw new Error('连不上')
      }) as unknown as typeof fetch,
    })
    await expect(remote.list(provider('http://127.0.0.1:9'), null)).resolves.toEqual([])

    const denied = createRemoteModels({
      timeoutMs: () => 1000,
      fetchImpl: (async () => new Response('nope', { status: 401 })) as unknown as typeof fetch,
    })
    await expect(denied.list(provider('https://api.example.com'), 'sk-x')).resolves.toEqual([])

    const weird = createRemoteModels({
      timeoutMs: () => 1000,
      fetchImpl: (async () =>
        new Response(JSON.stringify({ nope: true }), { status: 200 })) as unknown as typeof fetch,
    })
    await expect(weird.list(provider('https://api.example.com'), null)).resolves.toEqual([])
  })
})
