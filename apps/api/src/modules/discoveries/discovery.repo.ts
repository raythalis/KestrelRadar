import { randomUUID } from 'node:crypto'

import type { CreateDiscoveryInput, Discovery, UpdateDiscoveryInput } from '@kestrel/contracts'

import { API_PREFIX } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, toBool } from '../../db/sql.ts'

interface DiscoveryRow {
  id: string
  group_id: string
  name: string
  kind: string
  target: string
  cron_expression: string
  enabled: number
  created_at: string
  updated_at: string
  last_checked_at: string | null
  route_ok: number | null
  content_ok: number | null
  last_check_message: string
  latest_item_at: string | null
  baseline_established_at: string | null
  baseline_item_count: number | null
  item_count: number
  icon_file: string | null
}

export interface DiscoveryState {
  lastCheckedAt: string
  routeOk: boolean
  contentOk: boolean
  lastCheckMessage: string
  latestItemAt: string | null
}

export interface BaselineMark {
  establishedAt: string
  itemCount: number
}

function toDiscovery(row: DiscoveryRow): Discovery {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    kind: row.kind as Discovery['kind'],
    target: row.target,
    cronExpression: row.cron_expression,
    enabled: toBool(row.enabled),
    // 下次采集时间由调度器算，仓储这层不存
    nextRunAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastCheckedAt: row.last_checked_at,
    routeOk: row.route_ok === null ? null : toBool(row.route_ok),
    contentOk: row.content_ok === null ? null : toBool(row.content_ok),
    lastCheckMessage: row.last_check_message,
    latestItemAt: row.latest_item_at,
    itemCount: row.item_count ?? 0,
    baselineEstablishedAt: row.baseline_established_at,
    baselineItemCount: row.baseline_item_count,
    // 库里只存文件名，对外的地址在这里拼；没抓到就是 null（界面回落类型图标）
    iconUrl: row.icon_file ? `${API_PREFIX}/icons/${row.icon_file}` : null,
  }
}

const SELECT_WITH_COUNT = `select d.*, (select count(*) from items i where i.discovery_id = d.id) as item_count
  from discoveries d`

export function createDiscoveryRepo(db: Db) {
  const selectAll = db.prepare(`${SELECT_WITH_COUNT} order by d.created_at, d.id`)
  const selectOne = db.prepare(`${SELECT_WITH_COUNT} where d.id = ?`)
  const insertOne = db.prepare(
    `insert into discoveries (id, group_id, name, kind, target, cron_expression, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    `update discoveries set name = ?, kind = ?, target = ?, cron_expression = ?, enabled = ?, updated_at = ?
     where id = ?`,
  )
  const deleteOne = db.prepare('delete from discoveries where id = ?')

  function find(id: string): DiscoveryRow | undefined {
    return selectOne.get(id) as unknown as DiscoveryRow | undefined
  }

  return {
    list(): Discovery[] {
      return (selectAll.all() as unknown as DiscoveryRow[]).map(toDiscovery)
    },

    get(id: string): Discovery | undefined {
      const row = find(id)
      return row ? toDiscovery(row) : undefined
    },

    create(input: CreateDiscoveryInput): Discovery {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(
        id,
        input.groupId,
        input.name,
        input.kind,
        input.target,
        input.cronExpression,
        fromBool(input.enabled),
        now,
        now,
      )
      const created = find(id)
      if (!created) throw new Error('写入发现后读不回来')
      return toDiscovery(created)
    },

    update(id: string, patch: UpdateDiscoveryInput): Discovery | undefined {
      const current = find(id)
      if (!current) return undefined
      updateOne.run(
        patch.name ?? current.name,
        patch.kind ?? current.kind,
        patch.target ?? current.target,
        patch.cronExpression ?? current.cron_expression,
        fromBool(patch.enabled ?? toBool(current.enabled)),
        nowIso(),
        id,
      )
      const updated = find(id)
      if (!updated) return undefined
      return toDiscovery(updated)
    },

    remove(id: string): boolean {
      return deleteOne.run(id).changes > 0
    },

    /** 图标抓取结果回写：只存文件名，null 表示这次没抓到 */
    setIcon(id: string, iconFile: string | null): void {
      db.prepare('update discoveries set icon_file = ? where id = ?').run(iconFile, id)
    },

    /** 这个域名已经抓过哪张图（按域名去重，不重复拉） */
    findIconForPrefix(prefix: string): string | null {
      const row = db
        .prepare('select icon_file from discoveries where icon_file like ? limit 1')
        .get(`${prefix}-%`) as unknown as { icon_file: string } | undefined
      return row?.icon_file ?? null
    },

    updateState(id: string, state: DiscoveryState): void {
      db.prepare(
        `update discoveries set last_checked_at = ?, route_ok = ?, content_ok = ?, last_check_message = ?,
           latest_item_at = ? where id = ?`,
      ).run(
        state.lastCheckedAt,
        fromBool(state.routeOk),
        fromBool(state.contentOk),
        state.lastCheckMessage,
        state.latestItemAt,
        id,
      )
    },

    /** 首次采集只建基线：记下时间和当时收进来的条数，用于界面提示 */
    markBaseline(id: string, baseline: BaselineMark): void {
      db.prepare(
        'update discoveries set baseline_established_at = ?, baseline_item_count = ? where id = ?',
      ).run(baseline.establishedAt, baseline.itemCount, id)
    },
  }
}

export type DiscoveryRepo = ReturnType<typeof createDiscoveryRepo>
