import { buildApp } from './app.ts'
import { loadConfig } from './config/index.ts'

const config = loadConfig()

const app = await buildApp({ dbPath: config.dbPath, logger: config.logger })

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info(`Kestrel API 就绪：http://${config.host}:${config.port}，数据库 ${config.dbPath}`)
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
