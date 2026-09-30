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

  const container = buildContainer(db, {
    log: (level, message) => {
      if (level === 'warn') app.log.warn(message)
      else app.log.info(message)
    },
  })
  await app.register(
    async (instance) => {
      registerRoutes(instance, container)
    },
    { prefix: API_PREFIX },
  )

  let maintenance: NodeJS.Timeout | undefined

  if (options.enableScheduler !== false) {
    app.addHook('onReady', async () => {
      container.scheduler.start()
      // 事件归档这类打扫活儿每小时跑一遍，顺带在启动时先清一次
      const sweep = (): void => {
        const archived = container.merger.archiveStale()
        if (archived > 0) app.log.info(`事件归档：${archived} 个`)
      }
      sweep()
      maintenance = setInterval(sweep, 60 * 60 * 1000)
      maintenance.unref()
    })
  }

  app.addHook('onClose', async () => {
    if (maintenance) clearInterval(maintenance)
    container.scheduler.stop()
    db.close()
  })

  return app
}
