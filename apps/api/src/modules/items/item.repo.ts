import { randomUUID } from 'node:crypto'

import type { Db } from '../../db/index.ts'

export interface Item {
  id: string
  discoveryId: string
  fingerprint: string
  title: string
  url: string | null
  summary: string
  sourcePublishedAt: string | null
  firstSeenAt: string
  lastSeenAt: string
}

export interface NewItem {
  title: string
  url: string | null
  summary: string
  sourcePublishedAt: string | null
  fingerprint: string
}

interface ItemRow {
  id: string
  discovery_id: string
  fingerprint: string
  title: string
  url: string | null
  summary: string
  source_published_at: string | null
  first_seen_at: string
  last_seen_at: string
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    discoveryId: row.discovery_id,
    fingerprint: row.fingerprint,
    title: row.title,
    url: row.url,
    summary: row.summary,
    sourcePublishedAt: row.source_published_at,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  }
}

export function createItemRepo(db: Db) {
  const selectByDiscovery = db.prepare(
    'select * from items where discovery_id = ? order by coalesce(source_published_at, first_seen_at) desc, id',
  )
  const insertOne = db.prepare(
    `insert into items (id, discovery_id, fingerprint, title, url, summary, source_published_at, first_seen_at, last_seen_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const touchOne = db.prepare(
    'update items set last_seen_at = ? where discovery_id = ? and fingerprint = ?',
  )
  const selectLatestPublished = db.prepare(
    'select max(source_published_at) as latest_published from items where discovery_id = ?',
  )

  return {
    listByDiscovery(discoveryId: string): Item[] {
      return (selectByDiscovery.all(discoveryId) as unknown as ItemRow[]).map(toItem)
    },

    /**
     * 见过就刷新「最近见到」，没见过就插一条。
     * 返回 true 表示这是本次的新条目。
     */
    record(discoveryId: string, item: NewItem, seenAt: string): boolean {
      const touched = touchOne.run(seenAt, discoveryId, item.fingerprint)
      if (touched.changes > 0) return false
      insertOne.run(
        randomUUID(),
        discoveryId,
        item.fingerprint,
        item.title,
        item.url,
        item.summary,
        item.sourcePublishedAt,
        seenAt,
        seenAt,
      )
      return true
    },

    /** 库里该来源最新的一条「源发布时间」，卡片和后续排序都用它 */
    latestPublishedAt(discoveryId: string): string | null {
      const row = selectLatestPublished.get(discoveryId) as unknown as
        { latest_published: string | null } | undefined
      return row?.latest_published ?? null
    },
  }
}

export type ItemRepo = ReturnType<typeof createItemRepo>
