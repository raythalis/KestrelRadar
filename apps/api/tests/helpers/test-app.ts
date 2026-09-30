import { buildApp } from '../../src/app.ts'
import { createTempDb } from './temp-db.ts'

export async function createTestApp(dbPath?: string) {
  const db = dbPath ? undefined : createTempDb()
  // 测试里关掉采集调度：定时器不该跟着测试跑
  const app = await buildApp({ dbPath: dbPath ?? db!.path, logger: false, enableScheduler: false })
  return {
    app,
    cleanup: async () => {
      await app.close()
      db?.cleanup()
    },
  }
}
