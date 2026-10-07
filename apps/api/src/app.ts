import { dirname, join } from 'node:path'

import { API_PREFIX } from '@kestrel/contracts'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'

import { buildContainer } from './container.ts'
import type { TelegramGateway } from './modules/delivery/telegram.ts'
import { openDatabase } from './db/index.ts'
import { registerErrorHandler } from './plugins/errors.ts'
import { registerRoutes } from './routes/index.ts'

export interface BuildAppOptions {
  dbPath: string
  /** 日志：默认关；测试里可以塞个 pino 配置把输出抓下来 */
  logger?: FastifyServerOptions['logger']
  /** 采集调度默认跟着服务一起起；测试里关掉，免得定时器跟着测试跑 */
  enableScheduler?: boolean
  /** 测试用：换成假的 Telegram 网关，别真去打 Telegram */
  telegram?: TelegramGateway
  /** 测试用：替掉真网络（图标抓取、RSSHub 探测走它） */
  fetchImpl?: typeof fetch
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
    telegram: options.telegram,
    fetchImpl: options.fetchImpl,
    // 图标与数据库放在同一个数据目录下
    iconDir: options.dbPath === ':memory:' ? undefined : join(dirname(options.dbPath), 'icons'),
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
        // 采集轮次流水也在这个清理任务里收：只保留最近 N 天（隐藏配置项）
        const runs = container.runs.pruneOlderThan(container.hidden.runRetentionDays())
        if (runs > 0) app.log.info(`采集流水清理：${runs} 条`)
      }
      sweep()
      maintenance = setInterval(sweep, 60 * 60 * 1000)
      maintenance.unref()
    })
  }

  app.addHook('onClose', async () => {
    if (maintenance) clearInterval(maintenance)
    // 关服务前把攒在合并窗口里的消息发掉，别丢
    await container.batcher.flush().catch(() => undefined)
    container.scheduler.stop()
    db.close()
  })

  return app
}
