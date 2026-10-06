import type { SettingsService } from '../settings/settings.service.ts'

export interface RsshubRoutesDeps {
  settings: SettingsService
  fetchImpl?: typeof fetch
  /** 元数据缓多久（毫秒）：路由表很少变，默认 10 分钟 */
  cacheMs?: number
  timeoutMs?: number
}

const DEFAULT_CACHE_MS = 10 * 60 * 1000
const DEFAULT_TIMEOUT_MS = 5000
/** 实例之间 + 命名空间的缓存条目上限，超了清掉最旧的几条 */
const MAX_CACHE_ENTRIES = 64

interface RsshubRouteMeta {
  radar?: { source?: string[] }[]
}

type RouteTable = Record<string, RsshubRouteMeta>

/** 路由元数据里的 source 形如 "sspai.com/matrix"：只取域名那一段 */
export function hostFromSource(source: string): string | null {
  const trimmed = source.trim()
  if (!trimmed) return null
  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const host = withoutScheme.split(/[/?#]/)[0]?.toLowerCase() ?? ''
  return host || null
}

/** 路由键能不能代表这条具体路径：字面量要相等，`:参数` 段通配，`:参数?` 段可以缺 */
function routeMatches(key: string, wanted: string[]): boolean {
  const parts = key.split('/').filter(Boolean)
  function walk(i: number, j: number): boolean {
    if (i === parts.length) return j === wanted.length
    const part = parts[i] ?? ''
    const optional = part.endsWith('?')
    if (j < wanted.length && (part.startsWith(':') || part === wanted[j])) {
      if (walk(i + 1, j + 1)) return true
    }
    return optional ? walk(i + 1, j) : false
  }
  return walk(0, 0)
}

/**
 * 把具体目标匹配到路由表里的键：/activity/urfp0d9i → /activity/:slug。
 * 原样命中排最前；带 `?` 的可选参数段允许缺失（/trending/daily/any
 * 对得上 /trending/:since/:language/:spoken_language?）。
 */
export function matchingRoutes(routes: RouteTable, path: string): string[] {
  const wanted = path.split('/').filter(Boolean)
  const rest = Object.keys(routes).filter((key) => routeMatches(key, wanted))
  return routes[path] ? [path, ...rest.filter((key) => key !== path)] : rest
}

/**
 * RSSHub 源站反查：相对路由（/sspai/matrix）自己没有域名，
 * 但实例的路由元数据里带着源站（radar[].source = ["sspai.com/matrix"]）。
 * 查的是 {@link https://docs.rsshub.app} 的 /api/namespace/<命名空间>，不拉 feed。
 */
export function createRsshubRoutes(deps: RsshubRoutesDeps) {
  const doFetch = deps.fetchImpl ?? fetch
  const cacheMs = deps.cacheMs ?? DEFAULT_CACHE_MS
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const cache = new Map<string, { at: number; routes: RouteTable | null }>()

  async function metadata(baseUrl: string, namespace: string): Promise<RouteTable | null> {
    const key = `${baseUrl}|${namespace}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < cacheMs) return hit.routes

    let routes: RouteTable | null = null
    try {
      const url = new URL(`/api/namespace/${encodeURIComponent(namespace)}`, baseUrl)
      const accessKey = deps.settings.get().rsshubAccessKey.trim()
      if (accessKey) url.searchParams.set('key', accessKey)
      const response = await doFetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'application/json' },
      })
      if (response.ok) {
        const body = (await response.json()) as {
          routes?: RouteTable
          data?: { routes?: RouteTable }
        }
        routes = body.routes ?? body.data?.routes ?? null
      }
    } catch {
      routes = null
    }

    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(key, { at: Date.now(), routes })
    return routes
  }

  /** 相对路由 → 源站域名；实例没配、路由不认识、元数据里没源站都返回 null */
  async function resolveHost(target: string): Promise<string | null> {
    const baseUrl = deps.settings.get().rsshubBaseUrl.trim().replace(/\/+$/, '')
    if (!baseUrl) return null

    const path = target.trim().replace(/^\/+/, '').split(/[?#]/)[0] ?? ''
    const segments = path.split('/').filter(Boolean)
    const [namespace, ...rest] = segments
    if (!namespace) return null

    const routes = await metadata(baseUrl, namespace)
    if (!routes) return null

    const wanted = rest.length > 0 ? `/${rest.join('/')}` : '/index'
    for (const key of matchingRoutes(routes, wanted)) {
      const sources = routes[key]?.radar?.[0]?.source ?? []
      const host = sources.map(hostFromSource).find((item): item is string => Boolean(item))
      if (host) return host
    }
    return null
  }

  return { resolveHost }
}

export type RsshubRoutes = ReturnType<typeof createRsshubRoutes>
