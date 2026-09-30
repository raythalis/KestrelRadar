import { API_PREFIX } from '@kestrel/contracts'
import Fastify, { type FastifyInstance } from 'fastify'

import { buildContainer } from './container.ts'
import { openDatabase } from './db/index.ts'
import { registerErrorHandler } from './plugins/errors.ts'
import { registerRoutes } from './routes/index.ts'

export interface BuildAppOptions {
  dbPath: string
  logger?: boolean
  /** 采集调度默认跟着服务一起起；测试里关掉，免得定时器跟着测试跑 */
  enableScheduler?: boolean
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const db = openDatabase(options.dbPath)
  const app = Fastify({ logger: options.logger ?? false })

  registerErrorHandler(app)

  const container = buildContainer(db)
  await app.register(
    async (instance) => {
      registerRoutes(instance, container)
    },
    { prefix: API_PREFIX },
  )

  if (options.enableScheduler !== false) {
    app.addHook('onReady', async () => {
      container.scheduler.start()
    })
  }

  app.addHook('onClose', async () => {
    container.scheduler.stop()
    db.close()
  })

  return app
}
