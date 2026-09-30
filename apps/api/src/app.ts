import { API_PREFIX } from '@kestrel/contracts'
import Fastify, { type FastifyInstance } from 'fastify'

import { buildContainer } from './container.ts'
import { openDatabase } from './db/index.ts'
import { registerErrorHandler } from './plugins/errors.ts'
import { registerRoutes } from './routes/index.ts'

export interface BuildAppOptions {
  dbPath: string
  logger?: boolean
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

  app.addHook('onClose', async () => {
    db.close()
  })

  return app
}
