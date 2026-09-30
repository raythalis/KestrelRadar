import { randomUUID } from 'node:crypto'

import type { CreateModelInput, Model, UpdateModelInput } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, toBool } from '../../db/sql.ts'

interface ModelRow {
  id: string
  provider_id: string
  model_name: string
  enabled: number
  sort_order: number
  created_at: string
  updated_at: string
}

function toModel(row: ModelRow): Model {
  return {
    id: row.id,
    providerId: row.provider_id,
    modelName: row.model_name,
    enabled: toBool(row.enabled),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createModelRepo(db: Db) {
  const selectAll = db.prepare('select * from models order by sort_order, created_at, id')
  const selectOne = db.prepare('select * from models where id = ?')
  const insertOne = db.prepare(
    `insert into models (id, provider_id, model_name, enabled, sort_order, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    'update models set model_name = ?, enabled = ?, sort_order = ?, updated_at = ? where id = ?',
  )

  function find(id: string): ModelRow | undefined {
    return selectOne.get(id) as unknown as ModelRow | undefined
  }

  return {
    list(): Model[] {
      return (selectAll.all() as unknown as ModelRow[]).map(toModel)
    },

    get(id: string): Model | undefined {
      const row = find(id)
      return row ? toModel(row) : undefined
    },

    create(providerId: string, input: CreateModelInput): Model {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(
        id,
        providerId,
        input.modelName,
        fromBool(input.enabled),
        input.sortOrder,
        now,
        now,
      )
      const created = find(id)
      if (!created) throw new Error('写入模型后读不回来')
      return toModel(created)
    },

    update(id: string, patch: UpdateModelInput): Model | undefined {
      const current = find(id)
      if (!current) return undefined
      updateOne.run(
        patch.modelName ?? current.model_name,
        fromBool(patch.enabled ?? toBool(current.enabled)),
        patch.sortOrder ?? current.sort_order,
        nowIso(),
        id,
      )
      const updated = find(id)
      return updated ? toModel(updated) : undefined
    },

    remove(id: string): boolean {
      return db.prepare('delete from models where id = ?').run(id).changes > 0
    },
  }
}

export type ModelRepo = ReturnType<typeof createModelRepo>
