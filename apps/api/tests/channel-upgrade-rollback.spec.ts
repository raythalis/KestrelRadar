import { createHash } from 'node:crypto'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS, runMigrations } from '../src/db/migrations.ts'

const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

describe('v1.0.0 到 v1.1.0 的渠道迁移与备份回退', () => {
  it('升级保留旧渠道、动作、投递；回退必须用升级前备份', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kestrel-upgrade-'))
    const source = join(dir, 'v1.db')
    const upgraded = join(dir, 'upgraded.db')
    const restored = join(dir, 'restored.db')
    try {
      const v1 = new DatabaseSync(source)
      for (const [index, migration] of MIGRATIONS.slice(0, 12).entries()) {
        v1.exec(migration.sql)
        v1.exec(`pragma user_version = ${index + 1}`)
      }
      v1.exec("insert into groups (id,name,created_at,updated_at) values ('g','group','t','t')")
      v1.exec(
        "insert into channels (id,name,type,config,secret,created_at,updated_at) values ('tg','Telegram','telegram','{\"chatId\":\"123\"}','test-token','t','t'),('wh','Webhook','webhook','{\"url\":\"https://example.invalid/hook\"}',null,'t','t')",
      )
      v1.exec(
        "insert into actions (id,group_id,name,trigger_type,channel_id,created_at,updated_at) values ('a','g','action','instant','tg','t','t')",
      )
      v1.exec(
        "insert into deliveries (id,action_id,channel_id,trigger_type,status,created_at) values ('d','a','tg','instant','sent','t')",
      )
      v1.close()
      const before = hash(source)
      copyFileSync(source, upgraded)
      const db = new DatabaseSync(upgraded)
      db.exec('pragma foreign_keys = on')
      runMigrations(db)
      expect(
        (db.prepare('pragma user_version').get() as { user_version: number }).user_version,
      ).toBe(13)
      expect(
        db.prepare('select id, type, channel_type, config, secret from channels order by id').all(),
      ).toEqual([
        {
          id: 'tg',
          type: 'telegram',
          channel_type: 'telegram',
          config: '{"chatId":"123"}',
          secret: 'test-token',
        },
        {
          id: 'wh',
          type: 'webhook',
          channel_type: 'webhook',
          config: '{"url":"https://example.invalid/hook"}',
          secret: null,
        },
      ])
      expect(db.prepare('select id, channel_id from actions').all()).toEqual([
        { id: 'a', channel_id: 'tg' },
      ])
      expect(db.prepare('select id, action_id, channel_id, status from deliveries').all()).toEqual([
        { id: 'd', action_id: 'a', channel_id: 'tg', status: 'sent' },
      ])
      expect(db.prepare('pragma foreign_key_check').all()).toEqual([])
      expect(
        (db.prepare('pragma integrity_check').get() as { integrity_check: string }).integrity_check,
      ).toBe('ok')
      runMigrations(db)
      expect((db.prepare('select count(*) as n from channels').get() as { n: number }).n).toBe(2)
      db.close()
      expect(hash(source)).toBe(before)
      copyFileSync(source, restored)
      const old = new DatabaseSync(restored)
      expect(
        (old.prepare('pragma user_version').get() as { user_version: number }).user_version,
      ).toBe(12)
      expect(
        old
          .prepare('pragma table_info(channels)')
          .all()
          .map((column) => (column as { name: string }).name),
      ).not.toContain('channel_type')
      expect((old.prepare('select count(*) as n from deliveries').get() as { n: number }).n).toBe(1)
      old.close()
      expect(hash(restored)).toBe(before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
