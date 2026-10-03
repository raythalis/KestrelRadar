import { failureCopy, type FailureCode } from '@kestrel/contracts'

export type FetchFailureKind = 'network' | 'timeout' | 'http_status'

export class FetchError extends Error {
  readonly kind: FetchFailureKind
  readonly status?: number

  constructor(kind: FetchFailureKind, message: string, status?: number) {
    super(message)
    this.name = 'FetchError'
    this.kind = kind
    this.status = status
  }

  /** 错误码：写采集流水与异常记录时用它分类 */
  code(): FailureCode {
    if (this.kind === 'timeout') return 'fetch.timeout'
    if (this.kind === 'http_status') {
      if (this.status === 404) return 'fetch.http404'
      if (this.status === 401 || this.status === 403) return 'fetch.http401or403'
      return 'fetch.httpStatus'
    }
    return 'fetch.network'
  }

  /** 说人话，直接能显示给用户（文案在 contracts 的失败文案表里，这里只负责给参数） */
  describe(timeoutSeconds: number): string {
    return failureCopy(this.code(), { seconds: timeoutSeconds, status: this.status })
  }
}

export interface FetchOptions {
  timeoutSeconds: number
  maxRetries: number
  fetchImpl?: typeof fetch
  headers?: Record<string, string>
}

const RETRY_BASE_DELAY_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 取一次文本内容：限时、有限重试。
 * 4xx 不重试（重试也不会变好），网络类错误与 5xx 重试。
 */
export async function fetchText(
  url: string,
  options: FetchOptions,
): Promise<{ body: string; contentType: string; status: number }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const attempts = Math.max(1, options.maxRetries + 1)
  let lastError: FetchError | null = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(options.timeoutSeconds * 1000),
        headers: {
          accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5',
          'user-agent': 'Kestrel/0.1 (+https://github.com/raythalis/kestrel)',
          ...options.headers,
        },
      })
      if (!response.ok) {
        const error = new FetchError('http_status', `HTTP ${response.status}`, response.status)
        if (response.status < 500 || attempt === attempts) throw error
        lastError = error
      } else {
        return {
          body: await response.text(),
          contentType: response.headers.get('content-type') ?? '',
          status: response.status,
        }
      }
    } catch (error) {
      if (error instanceof FetchError) {
        lastError = error
      } else {
        const name = (error as Error).name
        lastError =
          name === 'TimeoutError' || name === 'AbortError'
            ? new FetchError('timeout', '请求超时')
            : new FetchError('network', (error as Error).message)
      }
      if (lastError.kind === 'timeout' && attempt === attempts) break
    }
    if (attempt < attempts) await sleep(RETRY_BASE_DELAY_MS * attempt)
  }

  throw lastError ?? new FetchError('network', '请求失败')
}
