import { buildApp } from '../../src/app.ts'
import { createTempDb } from './temp-db.ts'

export async function createTestApp(dbPath?: string) {
  const db = dbPath ? undefined : createTempDb()
  const app = await buildApp({ dbPath: dbPath ?? db!.path, logger: false })
  return {
    app,
    cleanup: async () => {
      await app.close()
      db?.cleanup()
    },
  }
}
