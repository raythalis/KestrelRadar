import { createServer, type Server } from 'node:http'

interface RouteResponse {
  status: number
  body: string
  contentType: string
  /** 设为 true 表示永不回应，用来测超时 */
  hang?: boolean
}

interface RouteState {
  /** 按顺序应答；用完就退回 fallback */
  queue: RouteResponse[]
  fallback: RouteResponse
}

export interface FeedServer {
  baseUrl: string
  /** 收到过的请求路径（含 query），按顺序记录 */
  requests: string[]
  /** 观测到「同时在处理」的请求数峰值，用来验证并发上限 */
  maxConcurrent: number
  setBody: (path: string, body: string, contentType?: string) => void
  setSequence: (path: string, responses: Partial<RouteResponse>[]) => void
  /** 让某个路径慢一点回应，用来观察并发 */
  setDelay: (path: string, ms: number) => void
  stop: () => Promise<void>
}

const DEFAULT_CONTENT_TYPE = 'application/rss+xml; charset=utf-8'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 本地假源：让采集层的测试不依赖外网，也不碰真实数据 */
export async function startFeedServer(
  initial: Record<string, { body: string; contentType?: string; status?: number }> = {},
): Promise<FeedServer> {
  const routes = new Map<string, RouteState>()
  const delays = new Map<string, number>()
  const requests: string[] = []
  let inFlight = 0
  let maxConcurrent = 0

  for (const [path, config] of Object.entries(initial)) {
    routes.set(path, {
      queue: [],
      fallback: {
        status: config.status ?? 200,
        body: config.body,
        contentType: config.contentType ?? DEFAULT_CONTENT_TYPE,
      },
    })
  }

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = req.url ?? '/'
      requests.push(url)
      const path = url.split('?')[0] ?? '/'
      const route = routes.get(path)
      if (!route) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('not found')
        return
      }

      inFlight += 1
      maxConcurrent = Math.max(maxConcurrent, inFlight)
      try {
        const delay = delays.get(path) ?? 0
        if (delay > 0) await sleep(delay)
        const response = route.queue.shift() ?? route.fallback
        if (response.hang) return
        res.writeHead(response.status, { 'content-type': response.contentType })
        res.end(response.body)
      } finally {
        inFlight -= 1
      }
    })()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('假源没能启动')

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    get maxConcurrent() {
      return maxConcurrent
    },
    setDelay(path, ms) {
      delays.set(path, ms)
    },
    setBody(path, body, contentType = DEFAULT_CONTENT_TYPE) {
      routes.set(path, { queue: [], fallback: { status: 200, body, contentType } })
    },
    setSequence(path, responses) {
      const queue = responses.map((item) => ({
        status: item.status ?? 200,
        body: item.body ?? '',
        contentType: item.contentType ?? DEFAULT_CONTENT_TYPE,
        hang: item.hang ?? false,
      }))
      const last = queue.at(-1) ?? { status: 200, body: '', contentType: DEFAULT_CONTENT_TYPE }
      routes.set(path, { queue, fallback: last })
    },
    async stop() {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}
