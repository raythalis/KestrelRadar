import { randomUUID } from 'node:crypto'

import type { CreateMonitorInput, Monitor, UpdateMonitorInput } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, parseStringArray, toBool } from '../../db/sql.ts'

interface MonitorRow {
  id: string
  group_id: string
  name: string
  mode: string
  sensitivity: string
  match_mode: string
  intent_text: string
  include_keywords: string
  exclude_keywords: string
  use_global_excludes: number
  enabled: number
  created_at: string
  updated_at: string
}

function toMonitor(row: MonitorRow, actionIds: string[]): Monitor {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    mode: row.mode as Monitor['mode'],
    sensitivity: row.sensitivity as Monitor['sensitivity'],
    matchMode: row.match_mode as Monitor['matchMode'],
    intentText: row.intent_text,
    includeKeywords: parseStringArray(row.include_keywords),
    excludeKeywords: parseStringArray(row.exclude_keywords),
    useGlobalExcludes: toBool(row.use_global_excludes),
    enabled: toBool(row.enabled),
    actionIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createMonitorRepo(db: Db) {
  const selectAll = db.prepare('select * from monitors order by created_at, id')
  const selectOne = db.prepare('select * from monitors where id = ?')
  const selectLinks = db.prepare(
    'select monitor_id, action_id from monitor_actions order by action_id',
  )
  const insertOne = db.prepare(
    `insert into monitors (id, group_id, name, mode, sensitivity, match_mode, intent_text, include_keywords,
       exclude_keywords, use_global_excludes, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    `update monitors set name = ?, mode = ?, sensitivity = ?, match_mode = ?, intent_text = ?,
       include_keywords = ?, exclude_keywords = ?, use_global_excludes = ?, enabled = ?, updated_at = ?
     where id = ?`,
  )
  const insertLink = db.prepare('insert into monitor_actions (monitor_id, action_id) values (?, ?)')
  const deleteLinks = db.prepare('delete from monitor_actions where monitor_id = ?')

  function linksByMonitor(): Map<string, string[]> {
    const rows = selectLinks.all() as unknown as { monitor_id: string; action_id: string }[]
    const map = new Map<string, string[]>()
    for (const row of rows) {
      const bucket = map.get(row.monitor_id)
      if (bucket) bucket.push(row.action_id)
      else map.set(row.monitor_id, [row.action_id])
    }
    return map
  }

  function find(id: string): MonitorRow | undefined {
    return selectOne.get(id) as unknown as MonitorRow | undefined
  }

  function replaceLinks(monitorId: string, actionIds: string[]): void {
    deleteLinks.run(monitorId)
    for (const actionId of actionIds) insertLink.run(monitorId, actionId)
  }

  return {
    list(): Monitor[] {
      const links = linksByMonitor()
      return (selectAll.all() as unknown as MonitorRow[]).map((row) =>
        toMonitor(row, links.get(row.id) ?? []),
      )
    },

    get(id: string): Monitor | undefined {
      const row = find(id)
      if (!row) return undefined
      return toMonitor(row, linksByMonitor().get(id) ?? [])
    },

    create(input: CreateMonitorInput): Monitor {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(
        id,
        input.groupId,
        input.name,
        input.mode,
        input.sensitivity,
        input.matchMode,
        input.intentText,
        JSON.stringify(input.includeKeywords),
        JSON.stringify(input.excludeKeywords),
        fromBool(input.useGlobalExcludes),
        fromBool(input.enabled),
        now,
        now,
      )
      replaceLinks(id, input.actionIds)
      const created = this.get(id)
      if (!created) throw new Error('写入监听后读不回来')
      return created
    },

    update(id: string, patch: UpdateMonitorInput): Monitor | undefined {
      const current = find(id)
      if (!current) return undefined
      updateOne.run(
        patch.name ?? current.name,
        patch.mode ?? current.mode,
        patch.sensitivity ?? current.sensitivity,
        patch.matchMode ?? current.match_mode,
        patch.intentText ?? current.intent_text,
        JSON.stringify(patch.includeKeywords ?? parseStringArray(current.include_keywords)),
        JSON.stringify(patch.excludeKeywords ?? parseStringArray(current.exclude_keywords)),
        fromBool(patch.useGlobalExcludes ?? toBool(current.use_global_excludes)),
        fromBool(patch.enabled ?? toBool(current.enabled)),
        nowIso(),
        id,
      )
      if (patch.actionIds !== undefined) replaceLinks(id, patch.actionIds)
      return this.get(id)
    },

    remove(id: string): boolean {
      return db.prepare('delete from monitors where id = ?').run(id).changes > 0
    },
  }
}

export type MonitorRepo = ReturnType<typeof createMonitorRepo>
