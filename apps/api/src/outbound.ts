import { formatDuration } from './stage-lines.ts'

/** 出站请求的日志口子：与容器里其它流程行同一个签名 */
export type OutboundLog = (level: 'info' | 'warn', message: string) => void

export interface OutboundFacts {
  /** 谁在发这条请求：`采集「HN 头条」`、`投递`、`判定`、`抓取图标` */
  actor: string
  url: string
  method?: string
  /** 拿到响应时的状态码 */
  status?: number
  /** 没拿到响应时的原因 */
  failure?: string
  durationMs: number
}

/**
 * 地址只留域名与路径，**查询串一律不要**（密钥常藏在那里，比如 RSSHub 的 `?key=`）；
 * 路径里明显是凭据的段也抹掉（Telegram 的 `/bot<token>/sendMessage`）。
 */
export function safeTarget(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl.split('?')[0] ?? rawUrl
  }
  const path = url.pathname
    .split('/')
    .map((segment) => {
      if (segment.length === 0) return segment
      // Telegram：/bot<token>/method
      if (segment.startsWith('bot') && segment.length > 8) return 'bot***'
      // 又长又像随机串的段（字母数字混排）当凭据处理
      if (
        segment.length >= 24 &&
        /^[A-Za-z0-9_-]+$/.test(segment) &&
        /[0-9]/.test(segment) &&
        /[A-Za-z]/.test(segment)
      ) {
        return '***'
      }
      return segment
    })
    .join('/')
  // 非 http(s) 的协议（smtp:// 之类）没有 origin，自己拼协议与主机
  const base = url.origin === 'null' ? `${url.protocol}//${url.host}` : url.origin
  return `${base}${path}`
}

/** 状态码说人话；正常返回空串 */
export function statusCopy(status: number): string {
  if (status === 401 || status === 403) return '认证失败'
  if (status === 404) return '目标不存在'
  if (status === 408) return '对方超时'
  if (status === 429) return '被限流'
  if (status >= 500) return '对方出错'
  if (status >= 400) return '请求不对'
  return ''
}

/** 出站请求一行：`采集「HN 头条」：GET https://… 200，用时 1.2 秒` */
export function outboundLine(facts: OutboundFacts): { level: 'info' | 'warn'; message: string } {
  // method 传空串表示不说方法（非 HTTP 的对外动作，比如 SMTP 投递）
  const method = facts.method === undefined ? 'GET' : facts.method.toUpperCase()
  const head = method
    ? `${facts.actor}：${method} ${safeTarget(facts.url)}`
    : `${facts.actor}：${safeTarget(facts.url)}`

  if (facts.failure !== undefined) {
    return {
      level: 'warn',
      message: `${head} 失败：${facts.failure}，用时 ${formatDuration(facts.durationMs)}`,
    }
  }

  // 没有状态码但也没失败：非 HTTP 的对外动作只说「完成」
  if (facts.status === undefined) {
    return { level: 'info', message: `${head} 完成，用时 ${formatDuration(facts.durationMs)}` }
  }

  const status = facts.status
  const copy = statusCopy(status)
  const tail = copy
    ? `${status}，${copy}，用时 ${formatDuration(facts.durationMs)}`
    : `${status}，用时 ${formatDuration(facts.durationMs)}`
  return { level: copy ? 'warn' : 'info', message: `${head} ${tail}` }
}

/** 出站失败说人话：超时、连不上、其余照搬原文（英文原文也比「未知错误」有用） */
export function describeFailure(error: unknown): string {
  const name = (error as Error | undefined)?.name ?? ''
  const message = (error as Error | undefined)?.message ?? ''
  if (name === 'TimeoutError' || name === 'AbortError') return '超时'
  if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|socket hang up/i.test(message)) {
    return '连不上'
  }
  return message || '没说明原因'
}

function emit(
  log: OutboundLog | undefined,
  line: { level: 'info' | 'warn'; message: string },
): void {
  log?.(line.level, line.message)
}

/** 后台补数据这类请求（探测、反查、图标）：成功不记免得刷屏，失败才记 */
export function warnOnly(log: OutboundLog | undefined): OutboundLog | undefined {
  if (!log) return undefined
  return (level, message) => {
    if (level === 'warn') log(level, message)
  }
}

/** 直接记一行出站：给非 HTTP 的对外动作用（比如 SMTP 投递） */
export function emitOutbound(log: OutboundLog | undefined, facts: OutboundFacts): void {
  emit(log, outboundLine(facts))
}

/**
 * 包一次出站请求：成功失败都记一行，然后把响应照原样返回、把错误照原样抛出。
 * 计时到拿到响应头为止（读 body 的时间不算，body 往往很大且另有处理）。
 */
export async function tracedFetch(
  doFetch: typeof fetch,
  log: OutboundLog | undefined,
  actor: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const startedAt = Date.now()
  const method = init?.method ?? 'GET'
  try {
    const response = await doFetch(url, init)
    emit(
      log,
      outboundLine({
        actor,
        url,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }),
    )
    return response
  } catch (error) {
    emit(
      log,
      outboundLine({
        actor,
        url,
        method,
        failure: describeFailure(error),
        durationMs: Date.now() - startedAt,
      }),
    )
    throw error
  }
}
