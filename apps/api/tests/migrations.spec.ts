import { DatabaseSync } from 'node:sqlite'

import { describe, expect, it } from 'vitest'

import { MIGRATIONS, runMigrations } from '../src/db/migrations.ts'
import { createTempDb } from './helpers/temp-db.ts'

const CONFIG_TABLES = [
  'groups',
  'discoveries',
  'monitors',
  'actions',
  'channels',
  'model_providers',
  'settings',
  'monitor_actions',
]

function tableNames(conn: DatabaseSync): string[] {
  return (
    conn.prepare("select name from sqlite_master where type = 'table'").all() as { name: string }[]
  ).map((row) => row.name)
}

function userVersion(conn: DatabaseSync): number {
  return (conn.prepare('pragma user_version').get() as { user_version: number }).user_version
}

describe('数据库迁移', () => {
  it('全新库跑完后配置表齐全，版本号等于迁移条数', () => {
    const db = createTempDb()
    const conn = new DatabaseSync(db.path)
    try {
      runMigrations(conn)
      const tables = tableNames(conn)
      for (const table of CONFIG_TABLES) expect(tables).toContain(table)
      expect(userVersion(conn)).toBe(MIGRATIONS.length)
      const cols = conn.prepare('pragma table_info(channels)').all() as { name: string }[]
      expect(cols.map((row) => row.name)).toContain('channel_type')
    } finally {
      conn.close()
      db.cleanup()
    }
  })

  it('重复执行不报错、版本号不变', () => {
    const db = createTempDb()
    const conn = new DatabaseSync(db.path)
    try {
      runMigrations(conn)
      const first = userVersion(conn)
      runMigrations(conn)
      expect(userVersion(conn)).toBe(first)
      expect(tableNames(conn).sort()).toEqual([...new Set(tableNames(conn))].sort())
    } finally {
      conn.close()
      db.cleanup()
    }
  })

  it('012：事件里没通过判定的成员被清掉，清空的事件删掉，已投递的留着', () => {
    const db = createTempDb()
    const conn = new DatabaseSync(db.path)
    try {
      runMigrations(conn)
      conn.exec(
        "insert into groups (id, name, created_at, updated_at) values ('g1', 'G', 't', 't')",
      )
      conn.exec(
        "insert into discoveries (id, group_id, name, kind, target, cron_expression, created_at, updated_at) values ('d1', 'g1', 'D', 'rss', 'https://e.com/f', '0 * * * *', 't', 't')",
      )
      conn.exec(
        "insert into monitors (id, group_id, name, mode, sensitivity, intent_text, include_keywords, exclude_keywords, use_global_excludes, enabled, created_at, updated_at) values ('m1', 'g1', 'M', 'algorithm', 'medium', '', '[]', '[]', 1, 1, 't', 't')",
      )
      for (const [id, title, seen] of [
        ['i1', '通过的', '2026-10-01T01:00:00.000Z'],
        ['i2', '丢弃的', '2026-10-01T02:00:00.000Z'],
        ['i3', '没判过的', '2026-10-01T03:00:00.000Z'],
      ] as const) {
        conn.exec(
          `insert into items (id, discovery_id, fingerprint, title, summary, first_seen_at, last_seen_at) values ('${id}', 'd1', '${id}', '${title}', '', '${seen}', '${seen}')`,
        )
      }
      for (const [id, itemId, decision] of [
        ['j1', 'i1', 'pass'],
        ['j2', 'i2', 'drop'],
      ] as const) {
        conn.exec(
          `insert into judgments (id, item_id, monitor_id, decision, band, score, matched_keywords, layer, reasons, created_at) values ('${id}', '${itemId}', 'm1', '${decision}', 'low', 0, '[]', 'score', '[]', 't')`,
        )
      }
      for (const [id, title, status] of [
        ['e1', '有通过的成员', 'new'],
        ['e2', '只有丢弃的成员', 'new'],
        ['e3', '只有没判过的成员', 'new'],
        ['e4', '已投递，成员没判过', 'delivered'],
      ] as const) {
        conn.exec(
          `insert into events (id, group_id, title, first_item_at, last_item_at, status, created_at, updated_at) values ('${id}', 'g1', '${title}', '2026-10-01T03:00:00.000Z', '2026-10-01T03:00:00.000Z', '${status}', 't', 't')`,
        )
      }
      conn.exec(
        "insert into event_items (event_id, item_id, discovery_id, added_at) values ('e1', 'i1', 'd1', 't'), ('e1', 'i2', 'd1', 't'), ('e2', 'i2', 'd1', 't'), ('e3', 'i3', 'd1', 't'), ('e4', 'i3', 'd1', 't')",
      )

      // 只重跑 012，验证它对已清理数据仍然安全
      conn.exec(MIGRATIONS[11]?.sql ?? '')

      const events = conn.prepare('select id, last_item_at from events order by id').all() as {
        id: string
        last_item_at: string
      }[]
      expect(events.map((row) => row.id)).toEqual(['e1', 'e4'])
      // 留下来的事件按剩余成员重算时间窗
      expect(events[0]?.last_item_at).toBe('2026-10-01T01:00:00.000Z')
      const members = conn
        .prepare('select event_id, item_id from event_items order by event_id')
        .all() as {
        event_id: string
        item_id: string
      }[]
      expect(members).toEqual([
        { event_id: 'e1', item_id: 'i1' },
        { event_id: 'e4', item_id: 'i3' },
      ])
    } finally {
      conn.close()
      db.cleanup()
    }
  })

  it('分组删除后，它下面的发现跟着删掉（外键级联）', async () => {
    const db = createTempDb()
    const conn = new DatabaseSync(db.path)
    try {
      runMigrations(conn)
      conn.exec("insert into groups (id, name, created_at, updated_at) values ('g1', 'G', '', '')")
      conn.exec(
        "insert into discoveries (id, group_id, name, kind, target, cron_expression, created_at, updated_at) values ('d1', 'g1', 'D', 'rsshub', 'https://example.com', '0 * * * *', '', '')",
      )
      conn.exec('pragma foreign_keys = on')
      conn.exec("delete from groups where id = 'g1'")
      const left = conn.prepare('select count(*) as n from discoveries').get() as { n: number }
      expect(left.n).toBe(0)
    } finally {
      conn.close()
      db.cleanup()
    }
  })
})
