import {
  EVENT_PAGE_SIZE,
  EVENT_PAGE_SIZE_MAX,
  EVENT_SOURCE_NAME_LIMIT,
  EVENT_WINDOW_HOURS,
  type EventListQuery,
  type EventPage,
  type EventReadResult,
  type EventSourceOption,
  type EventSourceRef,
  type RecentEvent,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { Item, ItemRepo } from '../items/item.repo.ts'
import type { SettingsService } from '../settings/settings.service.ts'
import type { Event, EventRepo } from './event.repo.ts'
import {
  hasNewVersionNumber,
  isSimilarEnough,
  MERGE_WINDOW_HOURS,
  normalizeUrl,
  progressSignals,
  titleSimilarity,
} from './similarity.ts'

const HOUR_MS = 60 * 60 * 1000

/** 一页几条：不传给默认值，超上限就截到上限，非法直接报错 */
function resolveLimit(limit?: number): number {
  if (limit === undefined) return EVENT_PAGE_SIZE
  if (!Number.isInteger(limit) || limit < 1) {
    throw AppError.validation('limit 必须是正整数')
  }
  return Math.min(limit, EVENT_PAGE_SIZE_MAX)
}

/** 游标：把「上一页最后一条的位置」编码成一个不透明字符串，调用方只负责原样带回来 */
interface ListCursor {
  lastItemAt: string
  id: string
}

function encodeCursor(cursor: ListCursor): string {
  return Buffer.from(`${cursor.lastItemAt}|${cursor.id}`, 'utf8').toString('base64url')
}

function parseCursor(raw?: string): ListCursor | undefined {
  if (raw === undefined || raw === '') return undefined
  const text = Buffer.from(raw, 'base64url').toString('utf8')
  const split = text.lastIndexOf('|')
  if (split <= 0 || split === text.length - 1) throw AppError.validation('cursor 不合法')
  return { lastItemAt: text.slice(0, split), id: text.slice(split + 1) }
}

export interface EventMergeResult {
  /** 新起的事件 */
  created: number
  /** 并进已有事件 */
  merged: number
  /** 其中标成「有更新」的 */
  updatedMarked: number
}

export interface EventServiceDeps {
  events: EventRepo
  discoveries: DiscoveryRepo
  groups: GroupRepo
  items: ItemRepo
  settings: SettingsService
}

/** 条目时间：优先用源自己写的发布时间，没有就用第一次见到的时间 */
function itemTime(item: Item): string {
  return item.sourcePublishedAt ?? item.firstSeenAt
}

export function createEventService(deps: EventServiceDeps) {
  /** 找不到同链接时，再按「标题像 + 时间近 + 同分组」找一条能并进去的 */
  function similarEvent(groupId: string, item: Item): Event | undefined {
    const time = Date.parse(itemTime(item))
    const since = new Date(time - MERGE_WINDOW_HOURS * HOUR_MS).toISOString()
    let best: { event: Event; score: number } | undefined
    for (const candidate of deps.events.candidatesForSimilarity(groupId, since)) {
      const distance = Math.abs(Date.parse(candidate.lastItemAt) - time)
      if (distance > MERGE_WINDOW_HOURS * HOUR_MS) continue
      if (!isSimilarEnough(item.title, candidate.title)) continue
      const score = titleSimilarity(item.title, candidate.title)
      if (!best || score > best.score) best = { event: candidate, score }
    }
    return best?.event
  }

  /**
   * 算不算「明确的新进展」：已投递过的事件 + 来自一个还没提过这件事的来源 + 内容里有进展信号。
   * 同一来源重复转载、换个人转述同一件事都不算——不然关注的人越多越吵。
   */
  function isProgress(event: Event, item: Item, discoveryId: string): boolean {
    if (event.status !== 'delivered') return false
    // 同一来源重复转载、换个人转述同一件事：都不算进展
    if (deps.events.memberDiscoveryIds(event.id).has(discoveryId)) return false

    const existing = deps.events
      .listItems(event.id)
      .map((member) => `${member.title} ${member.summary}`)
      .join(' ')
    const text = `${item.title} ${item.summary}`
    // 只有「这件事之前没提过」的进展信号才算数：原封不动转述一遍不算
    if (progressSignals(text).some((word) => !existing.includes(word))) return true
    return hasNewVersionNumber(text) && !hasNewVersionNumber(existing)
  }

  /** 窗口起点：只看这个时间之后还有动静的事件 */
  function windowStart(now: Date): string {
    return new Date(now.getTime() - EVENT_WINDOW_HOURS * HOUR_MS).toISOString()
  }

  /** 一条事件怎么给界面：来源标签、已读状态在这里补齐 */
  function toRecentEvent(
    event: Event,
    sources: EventSourceRef[],
    readAt: string | null,
  ): RecentEvent {
    const members = deps.events.listItems(event.id)
    const names: string[] = []
    for (const member of members) {
      if (!names.includes(member.discoveryName)) names.push(member.discoveryName)
    }
    // 行首那个图标按最先提到这件事的来源类型取；来源被删掉就退回 rss
    const kind = deps.discoveries.get(members[0]?.discoveryId ?? '')?.kind ?? 'rss'
    return {
      id: event.id,
      title: event.title,
      // 默认打开的原文＝第一个来源最早那条条目的链接（事件自己那条可能没有链接）
      url: sources[0]?.url ?? event.url,
      groupId: event.groupId,
      groupName: deps.groups.get(event.groupId)?.name ?? '',
      kind,
      // 全给：界面只挂前 EVENT_SOURCE_TAG_LIMIT 个标签，其余在 +N 浮层里列出来
      sources,
      sourceCount: event.sourceCount,
      // @deprecated 阶段 3 迁到 sources 之后删掉，现在只有旧的文字标签在用
      sourceNames: names.slice(0, EVENT_SOURCE_NAME_LIMIT),
      itemCount: event.itemCount,
      firstItemAt: event.firstItemAt,
      lastItemAt: event.lastItemAt,
      readAt,
    }
  }

  return {
    /**
     * 仪表盘的最近事件列表：窗口内（默认 24 小时）、按最近一次发生时间倒序，一页一页给。
     * 带上 cursor 就接着上一页往下取；返回的 nextCursor 为空表示到底了。
     */
    list(query: EventListQuery = {}, now: Date = new Date()): EventPage {
      const limit = resolveLimit(query.limit)
      const cursor = parseCursor(query.cursor)
      const rows = deps.events.listPage({
        sinceIso: windowStart(now),
        // 多要一条：能取到就说明还有下一页
        limit: limit + 1,
        cursor,
        discoveryId: query.discoveryId,
      })
      const hasMore = rows.length > limit
      const page = rows.slice(0, limit)
      const ids = page.map((event) => event.id)
      const sourceMap = deps.events.sourcesForEvents(ids)
      const readMap = deps.events.readAtForEvents(ids)
      const events = page.map((event) =>
        toRecentEvent(
          event,
          (sourceMap.get(event.id) ?? []).map((source) => ({
            discoveryId: source.discoveryId,
            name: source.name,
            url: source.url,
          })),
          readMap.get(event.id) ?? null,
        ),
      )
      const last = page[page.length - 1]
      return {
        events,
        nextCursor:
          hasMore && last ? encodeCursor({ lastItemAt: last.lastItemAt, id: last.id }) : null,
      }
    },

    /** 来源筛选弹层：窗口内每个来源有几个事件，多的排前面 */
    sources(now: Date = new Date()): EventSourceOption[] {
      return deps.events.sourceCountsSince(windowStart(now))
    },

    /** 点击查看后记已读；重复点击不改变第一次看的时间（幂等） */
    markRead(eventId: string, now: Date = new Date()): EventReadResult {
      if (!deps.events.get(eventId)) throw AppError.notFound('事件不存在')
      const at = now.toISOString()
      deps.events.markRead(eventId, at)
      return { id: eventId, readAt: deps.events.readAtForEvents([eventId]).get(eventId) ?? at }
    },

    /** 把这条来源里还没并入事件的条目归并一遍（幂等，重复调用不会多出事件） */
    async mergePendingItems(discoveryId: string): Promise<EventMergeResult> {
      const empty: EventMergeResult = { created: 0, merged: 0, updatedMarked: 0 }
      const discovery = deps.discoveries.get(discoveryId)
      if (!discovery) return empty
      const group = deps.groups.get(discovery.groupId)
      if (!group?.enabled) return empty

      const result: EventMergeResult = { ...empty }
      for (const item of deps.items.listByDiscovery(discoveryId)) {
        if (deps.events.memberEventId(item.id)) continue
        const at = itemTime(item)
        const urlKey = item.url ? normalizeUrl(item.url) : null
        const target =
          (urlKey ? deps.events.findByUrlKey(group.id, urlKey) : undefined) ??
          similarEvent(group.id, item)

        if (!target) {
          const created = deps.events.create({
            groupId: group.id,
            title: item.title,
            url: item.url,
            urlKey,
            itemAt: at,
          })
          deps.events.addItem(created.id, item.id, discoveryId, at)
          result.created += 1
          continue
        }

        if (isProgress(target, item, discoveryId)) {
          deps.events.markUpdated(target.id)
          result.updatedMarked += 1
        }
        deps.events.addItem(target.id, item.id, discoveryId, at)
        result.merged += 1
      }
      return result
    },

    /** 长期没有新条目的事件归档（按高级设置里的天数） */
    archiveStale(now: Date = new Date()): number {
      const days = deps.settings.get().eventArchiveDays
      const cutoff = new Date(now.getTime() - days * 24 * HOUR_MS).toISOString()
      return deps.events.archiveStale(cutoff)
    },
  }
}

export type EventService = ReturnType<typeof createEventService>
