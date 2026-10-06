import { randomUUID } from 'node:crypto'

import type { Db } from '../../db/index.ts'
import { nowIso } from '../../db/sql.ts'

export type EventStatus = 'new' | 'delivered' | 'updated' | 'archived'

export interface Event {
  id: string
  groupId: string
  title: string
  url: string | null
  /** 归一化后的链接，用来做「同一个链接必并」 */
  urlKey: string | null
  firstItemAt: string
  lastItemAt: string
  /** 有几个不同的来源提到（按发现去重） */
  sourceCount: number
  /** 事件里有几个条目 */
  itemCount: number
  status: EventStatus
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EventMember {
  itemId: string
  discoveryId: string
  discoveryName: string
  title: string
  url: string | null
  summary: string
  addedAt: string
}

interface EventRow {
  id: string
  group_id: string
  title: string
  url: string | null
  url_key: string | null
  first_item_at: string
  last_item_at: string
  status: string
  delivered_at: string | null
  created_at: string
  updated_at: string
  source_count: number
  item_count: number
}

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    url: row.url,
    urlKey: row.url_key,
    firstItemAt: row.first_item_at,
    lastItemAt: row.last_item_at,
    sourceCount: row.source_count,
    itemCount: row.item_count,
    status: row.status as EventStatus,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 来源数与条目数按关系表实时算，不存冗余计数，免得对不上 */
const COUNTS = `(select count(distinct ei.discovery_id) from event_items ei where ei.event_id = events.id) as source_count,
     (select count(*) from event_items ei where ei.event_id = events.id) as item_count`

export function createEventRepo(db: Db) {
  const countCreatedSince = db.prepare('select count(*) as total from events where created_at >= ?')
  const insertEvent = db.prepare(
    `insert into events (id, group_id, title, url, url_key, first_item_at, last_item_at, status, delivered_at,
       created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, 'new', null, ?, ?)`,
  )
  const insertMember = db.prepare(
    `insert or ignore into event_items (event_id, item_id, discovery_id, added_at) values (?, ?, ?, ?)`,
  )
  const selectById = db.prepare(`select events.*, ${COUNTS} from events where events.id = ?`)
  /** 仪表盘最近事件：没归档的按最近一次发生时间倒序 */
  const selectRecent = db.prepare(
    `select events.*, ${COUNTS} from events
      where events.status <> 'archived'
      order by events.last_item_at desc, events.id
      limit ?`,
  )
  const selectByGroup = db.prepare(
    `select events.*, ${COUNTS} from events where events.group_id = ? order by events.last_item_at desc, events.id`,
  )
  const selectByUrlKey = db.prepare(
    `select events.*, ${COUNTS} from events
      where events.group_id = ? and events.url_key = ? and events.status <> 'archived'
      order by events.last_item_at desc limit 1`,
  )
  const selectSimilarCandidates = db.prepare(
    `select events.*, ${COUNTS} from events
      where events.group_id = ? and events.status <> 'archived' and events.last_item_at >= ?
      order by events.last_item_at desc limit 200`,
  )
  const selectMembers = db.prepare(
    `select ei.item_id, ei.discovery_id, ei.added_at, i.title, i.url, i.summary, d.name as discovery_name
       from event_items ei
       join items i on i.id = ei.item_id
       join discoveries d on d.id = ei.discovery_id
      where ei.event_id = ?
      order by ei.added_at, i.title`,
  )
  const selectMemberItem = db.prepare('select event_id from event_items where item_id = ? limit 1')
  const selectEventIdsForItems = db.prepare(
    'select item_id, event_id from event_items where item_id in (select value from json_each(?))',
  )
  const selectMemberSources = db.prepare(
    'select distinct discovery_id from event_items where event_id = ?',
  )
  const touchEvent = db.prepare('update events set last_item_at = ?, updated_at = ? where id = ?')
  const setStatus = db.prepare('update events set status = ?, updated_at = ? where id = ?')
  const setDelivered = db.prepare(
    `update events set status = 'delivered', delivered_at = ?, updated_at = ? where id = ?`,
  )
  const archive = db.prepare(
    `update events set status = 'archived', updated_at = ?
      where status <> 'archived' and last_item_at < ?`,
  )

  return {
    create(input: {
      groupId: string
      title: string
      url: string | null
      urlKey: string | null
      itemAt: string
    }): Event {
      const now = nowIso()
      const id = randomUUID()
      insertEvent.run(
        id,
        input.groupId,
        input.title,
        input.url,
        input.urlKey,
        input.itemAt,
        input.itemAt,
        now,
        now,
      )
      const created = this.get(id)
      if (!created) throw new Error('写入事件后读不回来')
      return created
    },

    get(id: string): Event | undefined {
      const row = selectById.get(id) as unknown as EventRow | undefined
      return row ? toEvent(row) : undefined
    },

    /** 某个时间点之后新建了多少事件（仪表盘「今日事件」用它） */
    countCreatedSince(iso: string): number {
      const row = countCreatedSince.get(iso) as unknown as { total: number }
      return row.total
    },

    /** 仪表盘的最近事件列表用：只给没归档的，按最近一次发生时间倒序 */
    listRecent(limit: number): Event[] {
      return (selectRecent.all(limit) as unknown as EventRow[]).map(toEvent)
    },

    listByGroup(groupId: string): Event[] {
      return (selectByGroup.all(groupId) as unknown as EventRow[]).map(toEvent)
    },

    /** 同一个链接（归一化后相同）必并：这里只找没归档的 */
    findByUrlKey(groupId: string, urlKey: string): Event | undefined {
      const row = selectByUrlKey.get(groupId, urlKey) as unknown as EventRow | undefined
      return row ? toEvent(row) : undefined
    },

    /** 相似比较的候选：同分组、没归档、最近还很活跃的 */
    candidatesForSimilarity(groupId: string, sinceIso: string): Event[] {
      return (selectSimilarCandidates.all(groupId, sinceIso) as unknown as EventRow[]).map(toEvent)
    },

    addItem(eventId: string, itemId: string, discoveryId: string, itemAt: string): boolean {
      const inserted = insertMember.run(eventId, itemId, discoveryId, itemAt).changes > 0
      if (!inserted) return false
      const current = this.get(eventId)
      if (current && itemAt < current.firstItemAt) {
        db.prepare('update events set first_item_at = ? where id = ?').run(itemAt, eventId)
      }
      touchEvent.run(
        itemAt > (current?.lastItemAt ?? itemAt) ? itemAt : (current?.lastItemAt ?? itemAt),
        nowIso(),
        eventId,
      )
      return true
    },

    listItems(eventId: string): EventMember[] {
      const rows = selectMembers.all(eventId) as unknown as {
        item_id: string
        discovery_id: string
        discovery_name: string
        title: string
        url: string | null
        summary: string
        added_at: string
      }[]
      return rows.map((row) => ({
        itemId: row.item_id,
        discoveryId: row.discovery_id,
        discoveryName: row.discovery_name,
        title: row.title,
        url: row.url,
        summary: row.summary,
        addedAt: row.added_at,
      }))
    },

    /** 这个条目已经属于哪个事件了（归并幂等靠它） */
    memberEventId(itemId: string): string | undefined {
      const row = selectMemberItem.get(itemId) as unknown as { event_id: string } | undefined
      return row?.event_id
    },

    /** 一批条目分别属于哪个事件 */
    eventIdsForItems(itemIds: string[]): Map<string, string> {
      if (itemIds.length === 0) return new Map()
      const rows = selectEventIdsForItems.all(JSON.stringify(itemIds)) as unknown as {
        item_id: string
        event_id: string
      }[]
      return new Map(rows.map((row) => [row.item_id, row.event_id]))
    },

    memberDiscoveryIds(eventId: string): Set<string> {
      const rows = selectMemberSources.all(eventId) as unknown as { discovery_id: string }[]
      return new Set(rows.map((row) => row.discovery_id))
    },

    markDelivered(eventId: string, at: string): void {
      setDelivered.run(at, nowIso(), eventId)
    },

    markUpdated(eventId: string): void {
      setStatus.run('updated', nowIso(), eventId)
    },

    markNew(eventId: string): void {
      setStatus.run('new', nowIso(), eventId)
    },

    /** 长期没有新条目的事件归档，不再参与比较 */
    archiveStale(cutoffIso: string): number {
      return Number(archive.run(nowIso(), cutoffIso).changes)
    },
  }
}

export type EventRepo = ReturnType<typeof createEventRepo>
