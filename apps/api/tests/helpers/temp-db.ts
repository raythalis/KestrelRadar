import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { openDatabase, type Db } from '../../src/db/index.ts'

const connections = new Map<string, Set<Db>>()

/** 测试专用连接：清理临时目录前，先关闭仍打开的 SQLite 句柄 */
export function openTestDatabase(path: string): Db {
  const connection = openDatabase(path)
  const entries = connections.get(path) ?? new Set<Db>()
  entries.add(connection)
  connections.set(path, entries)
  return connection
}

/** 每条测试用独立临时库，绝不碰真实数据 */
export function createTempDb() {
  const dir = mkdtempSync(join(tmpdir(), 'kestrel-test-'))
  return {
    path: join(dir, 'kestrel.db'),
    cleanup: () => {
      for (const connection of connections.get(join(dir, 'kestrel.db')) ?? []) {
        if (connection.isOpen) connection.close()
      }
      connections.delete(join(dir, 'kestrel.db'))
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
