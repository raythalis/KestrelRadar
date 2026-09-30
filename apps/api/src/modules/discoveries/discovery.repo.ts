import { randomUUID } from 'node:crypto'

import type { CreateDiscoveryInput, Discovery, UpdateDiscoveryInput } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, toBool } from '../../db/sql.ts'

interface DiscoveryRow {
  id: string
  group_id: string
  name: string
  kind: string
  target: string
  access_key: string | null
  cron_expression: string
  enabled: number
  created_at: string
  updated_at: string
}

function toDiscovery(row: DiscoveryRow): Discovery {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    kind: row.kind as Discovery['kind'],
    target: row.target,
    hasAccessKey: Boolean(row.access_key),
    cronExpression: row.cron_expression,
    enabled: toBool(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createDiscoveryRepo(db: Db) {
  const selectAll = db.prepare('select * from discoveries order by created_at, id')
  const selectOne = db.prepare('select * from discoveries where id = ?')
  const insertOne = db.prepare(
    `insert into discoveries (id, group_id, name, kind, target, access_key, cron_expression, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    `update discoveries set name = ?, kind = ?, target = ?, access_key = ?, cron_expression = ?, enabled = ?, updated_at = ?
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
        input.accessKey ?? null,
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
      // 没传 accessKey 表示不动密钥；传 null 表示清空
      const accessKey = patch.accessKey === undefined ? current.access_key : patch.accessKey
      updateOne.run(
        patch.name ?? current.name,
        patch.kind ?? current.kind,
        patch.target ?? current.target,
        accessKey,
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
  }
}

export type DiscoveryRepo = ReturnType<typeof createDiscoveryRepo>
