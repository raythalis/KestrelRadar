import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { API_PREFIX } from '@kestrel/contracts'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'

import { runSafely } from './background.ts'
import { buildContainer } from './container.ts'
import { quietLogController } from './logging.ts'
import type { TelegramGateway } from './modules/delivery/telegram.ts'
import { openDatabase } from './db/index.ts'
import { registerErrorHandler } from './plugins/errors.ts'
import { registerRequestLog } from './plugins/request-log.ts'
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
  /** 生产托管：指向前端构建产物（apps/web/dist）。给了就一个进程同时提供界面与 API */
  staticDir?: string
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const db = openDatabase(options.dbPath)
  // 请求行自己打（见 plugins/request-log.ts）；Fastify 自带的请求日志在这里关掉
  const app = Fastify({ logger: options.logger ?? false, logController: quietLogController() })

  // 生产形态：界面与 API 同一个进程、同源，不需要反代，也不会有跨域
  const staticDir =
    options.staticDir && existsSync(options.staticDir) ? options.staticDir : undefined
  if (options.staticDir && !staticDir) {
    app.log.warn(`静态目录不存在，本次只提供 API：${options.staticDir}`)
  }

  registerErrorHandler(app, { spaFallback: Boolean(staticDir) })
  registerRequestLog(app)

  if (staticDir) {
    await app.register(fastifyStatic, { root: staticDir, index: ['index.html'] })
    app.log.info(`界面托管自 ${staticDir}`)
  }

  const container = buildContainer(db, {
    log: (level, message) => {
      if (level === 'warn') app.log.warn(message)
      else if (level === 'error') app.log.error(message)
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
      // 事件归档这类打扫活儿每小时跑一遍，顺带在启动时先清一次。
      // 走 runSafely：一轮失败只记一条警告，不把进程带走，下一轮照常重试。
      const sweep = (): Promise<boolean> =>
        runSafely(
          '事件归档与采集流水清理',
          () => {
            const archived = container.merger.archiveStale()
            if (archived > 0) app.log.info(`事件归档：${archived} 个`)
            // 采集轮次流水也在这个清理任务里收：只保留最近 N 天（隐藏配置项）
            const runs = container.runs.pruneOlderThan(container.hidden.runRetentionDays())
            if (runs > 0) app.log.info(`采集流水清理：${runs} 条`)
          },
          app.log,
        )
      await sweep()
      maintenance = setInterval(
        () => {
          void sweep()
        },
        60 * 60 * 1000,
      )
      maintenance.unref()
    })
  }

  app.addHook('onClose', async () => {
    if (maintenance) clearInterval(maintenance)
    // 关服务前把攒在合并窗口里的消息发掉，别丢
    await container.batcher.flush().catch(() => undefined)
    await container.scheduler.stop()
    db.close()
  })

  return app
}
