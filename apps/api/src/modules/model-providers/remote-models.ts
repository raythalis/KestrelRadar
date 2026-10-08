import type { ModelProvider } from '@kestrel/contracts'

export interface RemoteModelsDeps {
  /** 单次请求最多等多久（毫秒） */
  timeoutMs: () => number
  fetchImpl?: typeof fetch
  log?: (level: 'info' | 'warn', message: string) => void
}

/** 供应商地址可能带 /v1，也可能不带：统一拼成列模型的接口 */
function modelsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? `${trimmed}/models` : `${trimmed}/v1/models`
}

/**
 * 去供应商那里问它有哪些模型（OpenAI 兼容的 GET /v1/models，Ollama 也走同一个）。
 * 拿不到就返回空数组：界面上这一家的内容静默缺席，不报错、不提示。
 */
export function createRemoteModels(deps: RemoteModelsDeps) {
  const doFetch = deps.fetchImpl ?? fetch

  return {
    async list(provider: ModelProvider, apiKey: string | null): Promise<string[]> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), Math.max(1, deps.timeoutMs()))
      try {
        const response = await doFetch(modelsUrl(provider.baseUrl), {
          method: 'GET',
          signal: controller.signal,
          headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
        })
        if (!response.ok) throw new Error(`供应商返回 HTTP ${response.status}`)
        const payload = (await response.json()) as { data?: { id?: unknown }[] }
        const names = (payload.data ?? [])
          .map((item) => (typeof item.id === 'string' ? item.id.trim() : ''))
          .filter((name) => name.length > 0)
        return [...new Set(names)].sort()
      } catch (error) {
        deps.log?.('info', `问 ${provider.name} 的模型清单失败：${(error as Error).message}`)
        return []
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

export type RemoteModels = ReturnType<typeof createRemoteModels>
