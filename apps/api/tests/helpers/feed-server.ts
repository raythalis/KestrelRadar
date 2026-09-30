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
  setBody: (path: string, body: string, contentType?: string) => void
  setSequence: (path: string, responses: Partial<RouteResponse>[]) => void
  stop: () => Promise<void>
}

const DEFAULT_CONTENT_TYPE = 'application/rss+xml; charset=utf-8'

/** 本地假源：让采集层的测试不依赖外网，也不碰真实数据 */
export async function startFeedServer(
  initial: Record<string, { body: string; contentType?: string; status?: number }> = {},
): Promise<FeedServer> {
  const routes = new Map<string, RouteState>()
  const requests: string[] = []

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
    const url = req.url ?? '/'
    requests.push(url)
    const path = url.split('?')[0] ?? '/'
    const route = routes.get(path)
    if (!route) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')
      return
    }
    const response = route.queue.shift() ?? route.fallback
    if (response.hang) return
    res.writeHead(response.status, { 'content-type': response.contentType })
    res.end(response.body)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('假源没能启动')
  const baseUrl = `http://127.0.0.1:${address.port}`

  return {
    baseUrl,
    requests,
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
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
