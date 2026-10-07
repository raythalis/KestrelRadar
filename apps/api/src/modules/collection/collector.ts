import {
  failureCopy,
  operationCodeOf,
  type DiscoveryTestResult,
  type FailureCode,
} from '@kestrel/contracts'

import type { IncidentService } from '../incidents/incident.service.ts'
import type { SettingsService } from '../settings/settings.service.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { ItemRepo } from '../items/item.repo.ts'
import { buildFingerprint } from './fingerprint.ts'
import { FeedParseError, parseFeed, type ParsedEntry } from './feed-parser.ts'
import { FetchError, fetchText } from './fetcher.ts'
import type { RunRepo } from './run.repo.ts'

export interface CollectOutcome {
  discoveryId: string
  ok: boolean
  routeOk: boolean
  contentOk: boolean
  /** 这一轮抓回多少条（含重复） */
  foundCount: number
  /** 真正新增多少条 */
  newItemCount: number
  /** 失败时的错误码；成功与「成功但没条目」见下 */
  code: FailureCode | null
  message: string
}

export interface CollectorDeps {
  discoveries: DiscoveryRepo
  items: ItemRepo
  settings: SettingsService
  /** 异常记录：采集这一轮失败了就记一条（手动测试不记） */
  incidents?: IncidentService
  /** 采集轮次流水：一轮一条，只服务统计 */
  runs?: RunRepo
  /** 取分组名字，做异常记录里的分组快照 */
  groups?: GroupRepo
  fetchImpl?: typeof fetch
  /** 采集完的通知口子（判定层用它补判新条目），失败不影响采集 */
  onCollected?: (discoveryId: string, newItemCount: number) => void | Promise<void>
}

interface LoadResult {
  routeOk: boolean
  contentOk: boolean
  code: FailureCode | null
  message: string
  /** 排查要用的那个数：超时秒数 / HTTP 状态码。语言无关，卡片上的副信息用它 */
  detail?: string
  entries: ParsedEntry[]
}

/**
 * 这些码不算「失败」：只记流水，不开异常。
 * 空源是「通是通了，但没内容」，每天给你刷一条异常没有意义。
 */
const SILENT_CODES: ReadonlySet<FailureCode> = new Set<FailureCode>(['feed.noEntry'])

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
  function resolveUrl(
    discoveryId: string,
  ): { url: string; kind: string } | { error: string; code: FailureCode } {
    const discovery = deps.discoveries.get(discoveryId)
    if (!discovery) return { error: failureCopy('discovery.missing'), code: 'discovery.missing' }
    const settings = deps.settings.get()

    if (discovery.kind === 'rsshub' && !/^https?:\/\//i.test(discovery.target)) {
      if (!settings.rsshubBaseUrl) {
        return { error: failureCopy('rsshub.baseMissing'), code: 'rsshub.baseMissing' }
      }
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

  /** 把异常翻译成「错误码 + 人话 + 排查用的数」：码用来记流水与异常，话用来展示 */
  function failureOf(
    error: unknown,
    timeoutSeconds: number,
  ): { code: FailureCode; message: string; detail?: string } {
    if (error instanceof FetchError) {
      const code = error.code()
      // 超时与状态码这两个数只在原文里出现过，单独留一份语言无关的，前端当副信息展示
      const detail =
        code === 'fetch.timeout'
          ? `${timeoutSeconds}s`
          : error.status
            ? `HTTP ${error.status}`
            : undefined
      return { code, message: error.describe(timeoutSeconds), detail }
    }
    const message = (error as Error).message
    return { code: 'collection.failed', message: message || failureCopy('collection.failed') }
  }

  /** 取一次内容并解析：试抓与正式采集共用这一段 */
  async function loadEntries(discoveryId: string): Promise<LoadResult> {
    const settings = deps.settings.get()
    const target = resolveUrl(discoveryId)
    if ('error' in target) {
      return {
        routeOk: false,
        contentOk: false,
        code: target.code,
        message: target.error,
        entries: [],
      }
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
            code: 'web.noFeedLink',
            message: failureCopy('web.noFeedLink'),
            entries: [],
          }
        }
        feedUrl = new URL(href, target.url).toString()
      }
    } catch (error) {
      return {
        routeOk: false,
        contentOk: false,
        ...failureOf(error, settings.requestTimeoutSeconds),
        entries: [],
      }
    }

    try {
      const response = await fetchText(feedUrl, fetchOptions)
      const entries = parseFeed(response.body)
      if (entries.length === 0) {
        return {
          routeOk: true,
          contentOk: false,
          code: 'feed.noEntry',
          message: failureCopy('feed.noEntry'),
          entries: [],
        }
      }
      return {
        routeOk: true,
        contentOk: true,
        code: null,
        message: `取到 ${entries.length} 条`,
        entries,
      }
    } catch (error) {
      if (error instanceof FeedParseError) {
        // 空源与「不是订阅源」分开：前者只记流水，后者要开异常
        const empty = error.kind === 'empty'
        return {
          routeOk: true,
          contentOk: false,
          code: empty ? 'feed.noEntry' : 'feed.parseFailed',
          message: failureCopy(empty ? 'feed.noEntry' : 'feed.parseFailed'),
          entries: [],
        }
      }
      return {
        routeOk: false,
        contentOk: false,
        ...failureOf(error, settings.requestTimeoutSeconds),
        entries: [],
      }
    }
  }

  function latestPublishedAt(entries: ParsedEntry[]): string | null {
    const published = entries
      .map((entry) => entry.publishedAt)
      .filter((value): value is string => typeof value === 'string')
      .sort()
    return published.at(-1) ?? null
  }

  /** 只探测、不写条目：给卡片上的「测试」按钮用。手动测试不计入统计，也不记异常。 */
  async function probeDiscovery(discoveryId: string): Promise<DiscoveryTestResult> {
    const existing = deps.discoveries.get(discoveryId)
    if (!existing) {
      return {
        ok: false,
        code: operationCodeOf('discovery.missing'),
        message: failureCopy('discovery.missing'),
        details: { reason: 'discovery.missing' },
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
    // 探测成功 = 路由与内容两级都通；只通了路由不算成功
    const ok = result.routeOk && result.contentOk
    return {
      ok,
      // 成功不带码，失败才给业务码
      ...(ok ? {} : { code: operationCodeOf(result.code) }),
      message: result.message,
      ...(ok || !result.code ? {} : { details: { reason: result.code } }),
      data: {
        routeOk: result.routeOk,
        contentOk: result.contentOk,
        foundItemCount: result.entries.length,
        latestItemAt: probeLatest,
      },
    }
  }

  /** 正式采集：新条目入库，第一次只建基线。定时任务走这里。 */
  async function collectDiscovery(discoveryId: string): Promise<CollectOutcome> {
    const startedAt = Date.now()
    const discovery = deps.discoveries.get(discoveryId)
    if (!discovery) {
      return {
        discoveryId,
        ok: false,
        routeOk: false,
        contentOk: false,
        foundCount: 0,
        newItemCount: 0,
        code: 'discovery.missing',
        message: failureCopy('discovery.missing'),
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

    // 轮次流水：一轮一条，只服务统计（成功率、偶发失败的源数）
    deps.runs?.record(
      {
        discoveryId,
        routeOk: result.routeOk,
        contentOk: result.contentOk,
        foundCount: result.entries.length,
        newCount: newItemCount,
        durationMs: Date.now() - startedAt,
        code: result.code,
        message: result.message,
      },
      now,
    )

    // 异常：这一轮真的失败才记一条（空源不算失败，只算「通是通了但没内容」）
    if (result.code && !SILENT_CODES.has(result.code)) {
      deps.incidents?.record({
        kind: 'collection',
        targetId: discoveryId,
        targetName: discovery.name,
        groupId: discovery.groupId,
        groupName: deps.groups?.get(discovery.groupId)?.name ?? '',
        code: result.code,
        message: result.message,
        detail: result.detail ?? null,
      })
    }

    if (newItemCount > 0 && deps.onCollected) await deps.onCollected(discoveryId, newItemCount)

    return {
      discoveryId,
      ok: result.routeOk && result.contentOk,
      routeOk: result.routeOk,
      contentOk: result.contentOk,
      foundCount: result.entries.length,
      newItemCount,
      code: result.code,
      message: result.message,
    }
  }

  return { collectDiscovery, probeDiscovery }
}

export type Collector = ReturnType<typeof createCollector>
