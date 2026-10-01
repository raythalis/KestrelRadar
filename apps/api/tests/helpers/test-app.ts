import { buildApp } from '../../src/app.ts'
import type { TelegramGateway } from '../../src/modules/delivery/telegram.ts'
import { createTempDb } from './temp-db.ts'

export async function createTestApp(dbPath?: string, telegram?: TelegramGateway) {
  const db = dbPath ? undefined : createTempDb()
  const app = await buildApp({ dbPath: dbPath ?? db!.path, logger: false, telegram })
  return {
    app,
    cleanup: async () => {
      await app.close()
      db?.cleanup()
    },
  }
}
