import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { runMigrations } from './migrations.ts'

export type Db = DatabaseSync

export function openDatabase(dbPath: string): Db {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })
  const conn = new DatabaseSync(dbPath)
  if (dbPath !== ':memory:') conn.exec('pragma journal_mode = WAL')
  conn.exec('pragma foreign_keys = on')
  conn.exec('pragma busy_timeout = 5000')
  runMigrations(conn)
  return conn
}
