import { buildApp } from './app.ts'
import { loadConfig } from './config/index.ts'

const config = loadConfig()

const app = await buildApp({
  dbPath: config.dbPath,
  logger: config.logger,
  ...(config.staticDir ? { staticDir: config.staticDir } : {}),
})

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
