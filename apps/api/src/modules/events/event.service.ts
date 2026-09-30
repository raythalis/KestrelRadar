import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { Item, ItemRepo } from '../items/item.repo.ts'
import type { SettingsService } from '../settings/settings.service.ts'
import type { Event, EventRepo } from './event.repo.ts'
import {
  containsProgressSignal,
  isSimilarEnough,
  MERGE_WINDOW_HOURS,
  normalizeUrl,
  titleSimilarity,
} from './similarity.ts'

const HOUR_MS = 60 * 60 * 1000

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
    if (deps.events.memberDiscoveryIds(event.id).has(discoveryId)) return false
    return containsProgressSignal(`${item.title} ${item.summary}`)
  }

  return {
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
