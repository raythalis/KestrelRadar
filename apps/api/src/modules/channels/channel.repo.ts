import { randomUUID } from 'node:crypto'

import type { Channel, CreateChannelInput, UpdateChannelInput } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, parseStringRecord, toBool } from '../../db/sql.ts'

interface ChannelRow {
  id: string
  name: string
  type: string
  channel_type: string
  config: string
  secret: string | null
  enabled: number
  created_at: string
  updated_at: string
}

function toChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    name: row.name,
    type: row.channel_type as Channel['type'],
    config: parseStringRecord(row.config),
    hasSecret: Boolean(row.secret),
    enabled: toBool(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createChannelRepo(db: Db) {
  const selectAll = db.prepare('select * from channels order by created_at, id')
  const selectOne = db.prepare('select * from channels where id = ?')
  const insertOne = db.prepare(
    `insert into channels (id, name, type, channel_type, config, secret, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    `update channels set name = ?, type = ?, channel_type = ?, config = ?, secret = ?, enabled = ?, updated_at = ? where id = ?`,
  )

  function find(id: string): ChannelRow | undefined {
    return selectOne.get(id) as unknown as ChannelRow | undefined
  }

  return {
    list(): Channel[] {
      return (selectAll.all() as unknown as ChannelRow[]).map(toChannel)
    },

    get(id: string): Channel | undefined {
      const row = find(id)
      return row ? toChannel(row) : undefined
    },

    /** 发送时才用一次：密钥不进任何返回体 */
    getSecret(id: string): string | null {
      return find(id)?.secret ?? null
    },

    create(input: CreateChannelInput): Channel {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(
        id,
        input.name,
        input.type === 'telegram' || input.type === 'webhook' ? input.type : 'webhook',
        input.type,
        JSON.stringify(input.config),
        input.secret && input.secret.length > 0 ? input.secret : null,
        fromBool(input.enabled),
        now,
        now,
      )
      const created = find(id)
      if (!created) throw new Error('写入渠道后读不回来')
      return toChannel(created)
    },

    update(id: string, patch: UpdateChannelInput): Channel | undefined {
      const current = find(id)
      if (!current) return undefined
      const secret =
        patch.secret === undefined
          ? current.secret
          : patch.secret === null
            ? null
            : patch.secret || null
      updateOne.run(
        patch.name ?? current.name,
        patch.type && (patch.type === 'telegram' || patch.type === 'webhook')
          ? patch.type
          : 'webhook',
        patch.type ?? current.type,
        JSON.stringify(patch.config ?? parseStringRecord(current.config)),
        secret,
        fromBool(patch.enabled ?? toBool(current.enabled)),
        nowIso(),
        id,
      )
      const updated = find(id)
      return updated ? toChannel(updated) : undefined
    },

    remove(id: string): boolean {
      return db.prepare('delete from channels where id = ?').run(id).changes > 0
    },
  }
}

export type ChannelRepo = ReturnType<typeof createChannelRepo>
