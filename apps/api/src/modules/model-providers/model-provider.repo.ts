import { randomUUID } from 'node:crypto'

import type {
  CreateModelProviderInput,
  ModelProvider,
  UpdateModelProviderInput,
} from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, toBool } from '../../db/sql.ts'

interface ProviderRow {
  id: string
  name: string
  kind: string
  base_url: string
  api_key: string | null
  enabled: number
  sort_order: number
  created_at: string
  updated_at: string
}

function toProvider(row: ProviderRow): ModelProvider {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ModelProvider['kind'],
    baseUrl: row.base_url,
    hasApiKey: Boolean(row.api_key),
    enabled: toBool(row.enabled),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createModelProviderRepo(db: Db) {
  const selectAll = db.prepare('select * from model_providers order by sort_order, created_at, id')
  const selectOne = db.prepare('select * from model_providers where id = ?')
  const insertOne = db.prepare(
    `insert into model_providers (id, name, kind, base_url, api_key, enabled, sort_order, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    `update model_providers set name = ?, kind = ?, base_url = ?, api_key = ?, enabled = ?, sort_order = ?, updated_at = ?
     where id = ?`,
  )

  function find(id: string): ProviderRow | undefined {
    return selectOne.get(id) as unknown as ProviderRow | undefined
  }

  return {
    list(): ModelProvider[] {
      return (selectAll.all() as unknown as ProviderRow[]).map(toProvider)
    },

    get(id: string): ModelProvider | undefined {
      const row = find(id)
      return row ? toProvider(row) : undefined
    },

    create(input: CreateModelProviderInput): ModelProvider {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(
        id,
        input.name,
        input.kind,
        input.baseUrl,
        input.apiKey && input.apiKey.length > 0 ? input.apiKey : null,
        fromBool(input.enabled),
        input.sortOrder,
        now,
        now,
      )
      const created = find(id)
      if (!created) throw new Error('写入供应商后读不回来')
      return toProvider(created)
    },

    update(id: string, patch: UpdateModelProviderInput): ModelProvider | undefined {
      const current = find(id)
      if (!current) return undefined
      const apiKey =
        patch.apiKey === undefined
          ? current.api_key
          : patch.apiKey === null
            ? null
            : patch.apiKey || null
      updateOne.run(
        patch.name ?? current.name,
        patch.kind ?? current.kind,
        patch.baseUrl ?? current.base_url,
        apiKey,
        fromBool(patch.enabled ?? toBool(current.enabled)),
        patch.sortOrder ?? current.sort_order,
        nowIso(),
        id,
      )
      const updated = find(id)
      return updated ? toProvider(updated) : undefined
    },

    remove(id: string): boolean {
      return db.prepare('delete from model_providers where id = ?').run(id).changes > 0
    },
  }
}

export type ModelProviderRepo = ReturnType<typeof createModelProviderRepo>
