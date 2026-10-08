import type { SettingKey, Settings } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { nowIso, parseJsonValue } from '../../db/sql.ts'

/** 库里只存被改过的项，值一律 JSON 序列化；没存过的走代码里的默认值 */
export function createSettingsRepo(db: Db) {
  const selectAll = db.prepare('select key, value from settings')
  const upsertOne = db.prepare(
    `insert into settings (key, value, updated_at) values (?, ?, ?)
     on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at`,
  )
  const deleteOne = db.prepare('delete from settings where key = ?')
  const selectOne = db.prepare('select value from settings where key = ?')

  return {
    readOverrides(): Partial<Settings> {
      const rows = selectAll.all() as unknown as { key: string; value: string }[]
      const overrides: Record<string, unknown> = {}
      for (const row of rows) {
        const value = parseJsonValue<unknown>(row.value, undefined)
        if (value !== undefined) overrides[row.key] = value
      }
      return overrides as Partial<Settings>
    },

    write(key: SettingKey, value: unknown): void {
      upsertOne.run(key, JSON.stringify(value), nowIso())
    },

    remove(key: SettingKey): boolean {
      return deleteOne.run(key).changes > 0
    },

    /**
     * 隐藏配置项：跟可见设置同一张表，但键名带 hidden. 前缀，不进设置接口、界面上不出现。
     * 默认值固化在 contracts 的 HIDDEN_LIMITS 里。
     */
    readHidden<T>(key: string, fallback: T): T {
      const row = selectOne.get(key) as unknown as { value: string } | undefined
      return row ? parseJsonValue<T>(row.value, fallback) : fallback
    },

    writeHidden(key: string, value: unknown): void {
      upsertOne.run(key, JSON.stringify(value), nowIso())
    },
  }
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>
