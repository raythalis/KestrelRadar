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
