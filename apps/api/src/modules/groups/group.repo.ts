import { randomUUID } from 'node:crypto'

import type { CreateGroupInput, Group, UpdateGroupInput } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, toBool } from '../../db/sql.ts'

interface GroupRow {
  id: string
  name: string
  description: string
  enabled: number
  created_at: string
  updated_at: string
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: toBool(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createGroupRepo(db: Db) {
  const selectAll = db.prepare('select * from groups order by created_at, id')
  const selectOne = db.prepare('select * from groups where id = ?')
  const insertOne = db.prepare(
    `insert into groups (id, name, description, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?)`,
  )
  const deleteOne = db.prepare('delete from groups where id = ?')

  return {
    list(): Group[] {
      return (selectAll.all() as unknown as GroupRow[]).map(toGroup)
    },

    get(id: string): Group | undefined {
      const row = selectOne.get(id) as unknown as GroupRow | undefined
      return row ? toGroup(row) : undefined
    },

    create(input: CreateGroupInput): Group {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(id, input.name, input.description, fromBool(input.enabled), now, now)
      return {
        id,
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        createdAt: now,
        updatedAt: now,
      }
    },

    update(id: string, patch: UpdateGroupInput): Group | undefined {
      const current = this.get(id)
      if (!current) return undefined
      const next: Group = {
        ...current,
        name: patch.name ?? current.name,
        description: patch.description ?? current.description,
        enabled: patch.enabled ?? current.enabled,
        updatedAt: nowIso(),
      }
      db.prepare(
        'update groups set name = ?, description = ?, enabled = ?, updated_at = ? where id = ?',
      ).run(next.name, next.description, fromBool(next.enabled), next.updatedAt, id)
      return next
    },

    remove(id: string): boolean {
      return deleteOne.run(id).changes > 0
    },
  }
}

export type GroupRepo = ReturnType<typeof createGroupRepo>
