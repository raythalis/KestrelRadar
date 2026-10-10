import { buildApp } from './app.ts'
import { loadConfig } from './config/index.ts'
import { registerProcessGuards } from './process-guards.ts'

const config = loadConfig()

const app = await buildApp({
  dbPath: config.dbPath,
  logger: config.logger,
  ...(config.staticDir ? { staticDir: config.staticDir } : {}),
})

// 优雅停机 + 进程级兜底：停机信号、未捕获异常、未处理的异步失败都在这里收口
registerProcessGuards({ app })

try {
  await app.listen({ host: config.host, port: config.port })
  const shape = config.staticDir ? '界面 + API' : '仅 API'
  app.log.info(
    `Kestrel Radar 就绪：http://${config.host}:${config.port}（${shape}），数据库 ${config.dbPath}`,
  )
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
