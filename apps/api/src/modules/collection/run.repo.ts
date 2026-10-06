import { randomUUID } from 'node:crypto'

import type { CollectionRun } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, toBool } from '../../db/sql.ts'
import { dailySumColumns, type DayWindow } from '../../utils/day.ts'

interface RunRow {
  id: string
  discovery_id: string
  route_ok: number
  content_ok: number
  found_count: number
  new_count: number
  duration_ms: number
  code: string | null
  message: string
  created_at: string
}

export interface NewRun {
  discoveryId: string
  /** 请求到了内容（含「成功但没条目」） */
  routeOk: boolean
  /** 内容可用（解析出了条目） */
  contentOk: boolean
  foundCount: number
  newCount: number
  durationMs: number
  code: string | null
  message: string
}

export interface DiscoveryWindowStat {
  discoveryId: string
  rounds: number
  okRounds: number
  found: number
  daily: number[]
}

function toRun(row: RunRow): CollectionRun {
  return {
    id: row.id,
    discoveryId: row.discovery_id,
    routeOk: toBool(row.route_ok),
    contentOk: toBool(row.content_ok),
    foundCount: row.found_count,
    newCount: row.new_count,
    durationMs: row.duration_ms,
    code: row.code,
    message: row.message,
    createdAt: row.created_at,
  }
}

/**
 * 采集轮次流水：一轮一条，只服务统计（成功率、偶发失败的源数）。
 * 界面上不直接展示，也不需要「连续失败次数」这种跨轮语义——那是异常记录管的事。
 */
export function createRunRepo(db: Db) {
  const insertOne = db.prepare(
    `insert into collection_runs (id, discovery_id, route_ok, content_ok, found_count, new_count,
       duration_ms, code, message, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const selectRecent = db.prepare(
    'select * from collection_runs order by created_at desc, rowid desc limit ?',
  )
  const selectSince = db.prepare(
    'select * from collection_runs where created_at >= ? order by created_at desc, rowid desc',
  )
  const deleteBefore = db.prepare('delete from collection_runs where created_at < ?')

  return {
    record(input: NewRun, at: string): CollectionRun {
      const id = randomUUID()
      insertOne.run(
        id,
        input.discoveryId,
        fromBool(input.routeOk),
        fromBool(input.contentOk),
        input.foundCount,
        input.newCount,
        input.durationMs,
        input.code,
        input.message,
        at,
      )
      return {
        id,
        discoveryId: input.discoveryId,
        routeOk: input.routeOk,
        contentOk: input.contentOk,
        foundCount: input.foundCount,
        newCount: input.newCount,
        durationMs: input.durationMs,
        code: input.code,
        message: input.message,
        createdAt: at,
      }
    },

    listRecent(limit: number): CollectionRun[] {
      return (selectRecent.all(limit) as unknown as RunRow[]).map(toRun)
    },

    listSince(sinceIso: string): CollectionRun[] {
      return (selectSince.all(sinceIso) as unknown as RunRow[]).map(toRun)
    },

    /** 窗口内的汇总：总轮次、请求成功的轮次、出现过失败的源数 */
    summarySince(sinceIso: string): { rounds: number; routeOk: number; failingSources: number } {
      const rows = selectSince.all(sinceIso) as unknown as RunRow[]
      return {
        rounds: rows.length,
        routeOk: rows.filter((row) => row.route_ok === 1).length,
        failingSources: new Set(
          rows.filter((row) => row.route_ok === 0).map((row) => row.discovery_id),
        ).size,
      }
    },

    /**
     * 按源的窗口汇总：成功率看「路由成功」的轮次（与仪表盘同口径），
     * 计数与 daily 都是抓到的条数。窗口内没有轮次的源不会出现在结果里。
     */
    discoveryStatsSince(windows: DayWindow[]): DiscoveryWindowStat[] {
      const daily = dailySumColumns('found_count', windows)
      const first = windows[0]
      const last = windows[windows.length - 1]
      if (!first || !last) return []
      const rows = db
        .prepare(
          `select discovery_id,
             count(*) as rounds,
             coalesce(sum(route_ok), 0) as ok_rounds,
             coalesce(sum(found_count), 0) as found,
             ${daily.sql}
           from collection_runs
           where created_at >= ? and created_at < ?
           group by discovery_id`,
        )
        .all(...daily.params, first.start, last.end) as unknown as {
        discovery_id: string
        rounds: number
        ok_rounds: number
        found: number
        [column: `d${number}`]: number
      }[]
      return rows.map((row) => ({
        discoveryId: row.discovery_id,
        rounds: row.rounds,
        okRounds: row.ok_rounds,
        found: row.found,
        daily: windows.map((_, index) => row[`d${index}`] ?? 0),
      }))
    },

    /** 保留 N 天：接在同一个每小时清理任务里跑 */
    pruneOlderThan(days: number, now: Date = new Date()): number {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      return Number(deleteBefore.run(cutoff).changes)
    },
  }
}

export type RunRepo = ReturnType<typeof createRunRepo>
