import type { DiscoveryTestResult } from '@kestrel/contracts'

import type { SettingsService } from '../settings/settings.service.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { ItemRepo } from '../items/item.repo.ts'
import { buildFingerprint } from './fingerprint.ts'
import { FeedParseError, parseFeed, type ParsedEntry } from './feed-parser.ts'
import { FetchError, fetchText } from './fetcher.ts'

export interface CollectOutcome {
  discoveryId: string
  ok: boolean
  routeOk: boolean
  contentOk: boolean
  newItemCount: number
  message: string
}

export interface CollectorDeps {
  discoveries: DiscoveryRepo
  items: ItemRepo
  settings: SettingsService
  fetchImpl?: typeof fetch
  /** 采集完的通知口子（判定层用它补判新条目），失败不影响采集 */
  onCollected?: (discoveryId: string, newItemCount: number) => void | Promise<void>
}

interface LoadResult {
  routeOk: boolean
  contentOk: boolean
  message: string
  entries: ParsedEntry[]
}

const FEED_LINK_PATTERN = /<link\b[^>]*>/gi

/** 从网页里找订阅源地址（rel=alternate + rss/atom 类型） */
function findFeedHref(html: string): string | null {
  for (const tag of html.match(FEED_LINK_PATTERN) ?? []) {
    const type = /type\s*=\s*["']?([^"'>\s]+)/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    if (!type.includes('rss') && !type.includes('atom')) continue
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (href) return href
  }
  return null
}

export function createCollector(deps: CollectorDeps) {
  function resolveUrl(discoveryId: string): { url: string; kind: string } | { error: string } {
    const discovery = deps.discoveries.get(discoveryId)
    if (!discovery) return { error: '发现不存在' }
    const settings = deps.settings.get()

    if (discovery.kind === 'rsshub' && !/^https?:\/\//i.test(discovery.target)) {
      if (!settings.rsshubBaseUrl) return { error: '还没有配置 RSSHub 实例地址（见全局设置）' }
      const base = settings.rsshubBaseUrl.replace(/\/+$/, '')
      const path = discovery.target.startsWith('/') ? discovery.target : `/${discovery.target}`
      // 单实例：密钥跟着实例地址一起配在全局设置里
      const suffix = settings.rsshubAccessKey
        ? `${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(settings.rsshubAccessKey)}`
        : ''
      return { url: `${base}${path}${suffix}`, kind: 'feed' }
    }

    return { url: discovery.target, kind: discovery.kind === 'web' ? 'web' : 'feed' }
  }

  /** 取一次内容并解析：试抓与正式采集共用这一段 */
  async function loadEntries(discoveryId: string): Promise<LoadResult> {
    const settings = deps.settings.get()
    const target = resolveUrl(discoveryId)
    if ('error' in target) {
      return { routeOk: false, contentOk: false, message: target.error, entries: [] }
    }

    const fetchOptions = {
      timeoutSeconds: settings.requestTimeoutSeconds,
      maxRetries: settings.maxRetries,
      fetchImpl: deps.fetchImpl,
    }

    let feedUrl = target.url
    try {
      if (target.kind === 'web') {
        const page = await fetchText(target.url, fetchOptions)
        const href = findFeedHref(page.body)
        if (!href) {
          return {
            routeOk: true,
            contentOk: false,
            message: '页面能打开，但里面没有 RSS/Atom 订阅源，建议改用 RSSHub 路由',
            entries: [],
          }
        }
        feedUrl = new URL(href, target.url).toString()
      }
    } catch (error) {
      return {
        routeOk: false,
        contentOk: false,
        message: describeError(error, settings.requestTimeoutSeconds),
        entries: [],
      }
    }

    try {
      const response = await fetchText(feedUrl, fetchOptions)
      const entries = parseFeed(response.body)
      if (entries.length === 0) {
        return { routeOk: true, contentOk: false, message: '订阅源里当前没有条目', entries: [] }
      }
      return { routeOk: true, contentOk: true, message: `取到 ${entries.length} 条`, entries }
    } catch (error) {
      if (error instanceof FeedParseError) {
        return {
          routeOk: true,
          contentOk: false,
          message: `${error.message}，建议改用 RSSHub 路由`,
          entries: [],
        }
      }
      return {
        routeOk: false,
        contentOk: false,
        message: describeError(error, settings.requestTimeoutSeconds),
        entries: [],
      }
    }
  }

  function describeError(error: unknown, timeoutSeconds: number): string {
    if (error instanceof FetchError) return error.describe(timeoutSeconds)
    return (error as Error).message || '未知错误'
  }

  function latestPublishedAt(entries: ParsedEntry[]): string | null {
    const published = entries
      .map((entry) => entry.publishedAt)
      .filter((value): value is string => typeof value === 'string')
      .sort()
    return published.at(-1) ?? null
  }

  /** 只探测、不写条目：给卡片上的「测试」按钮用 */
  async function probeDiscovery(discoveryId: string): Promise<DiscoveryTestResult> {
    const existing = deps.discoveries.get(discoveryId)
    if (!existing) {
      return {
        routeOk: false,
        contentOk: false,
        foundItemCount: 0,
        latestItemAt: null,
        message: '发现不存在',
      }
    }
    const result = await loadEntries(discoveryId)
    const probeLatest = latestPublishedAt(result.entries)
    deps.discoveries.updateState(discoveryId, {
      lastCheckedAt: new Date().toISOString(),
      routeOk: result.routeOk,
      contentOk: result.contentOk,
      lastCheckMessage: result.message,
      // 探测不到内容时保留上次已知的时间，不要把卡片上的信息抹掉
      latestItemAt: probeLatest ?? existing.latestItemAt,
    })
    return {
      routeOk: result.routeOk,
      contentOk: result.contentOk,
      foundItemCount: result.entries.length,
      latestItemAt: probeLatest,
      message: result.message,
    }
  }

  /** 正式采集：新条目入库，第一次只建基线。定时任务与手动测试都走这里。 */
  async function collectDiscovery(discoveryId: string): Promise<CollectOutcome> {
    const discovery = deps.discoveries.get(discoveryId)
    if (!discovery) {
      return {
        discoveryId,
        ok: false,
        routeOk: false,
        contentOk: false,
        newItemCount: 0,
        message: '发现不存在',
      }
    }

    const result = await loadEntries(discoveryId)
    const now = new Date().toISOString()
    let newItemCount = 0

    for (const entry of result.entries) {
      const recorded = deps.items.record(
        discoveryId,
        {
          title: entry.title,
          url: entry.url,
          summary: entry.summary,
          sourcePublishedAt: entry.publishedAt,
          fingerprint: buildFingerprint({
            url: entry.url,
            title: entry.title,
            summary: entry.summary,
          }),
        },
        now,
      )
      if (recorded) newItemCount += 1
    }

    deps.discoveries.updateState(discoveryId, {
      lastCheckedAt: now,
      routeOk: result.routeOk,
      contentOk: result.contentOk,
      lastCheckMessage: result.message,
      latestItemAt: deps.items.latestPublishedAt(discoveryId),
    })

    if (discovery.baselineEstablishedAt === null && result.contentOk) {
      deps.discoveries.markBaseline(discoveryId, { establishedAt: now, itemCount: newItemCount })
    }

    if (newItemCount > 0 && deps.onCollected) await deps.onCollected(discoveryId, newItemCount)

    return {
      discoveryId,
      ok: result.routeOk && result.contentOk,
      routeOk: result.routeOk,
      contentOk: result.contentOk,
      newItemCount,
      message: result.message,
    }
  }

  return { collectDiscovery, probeDiscovery }
}

export type Collector = ReturnType<typeof createCollector>
