import { updateSettingsInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { SettingsService } from './settings.service.ts'

export function registerSettingsRoutes(app: FastifyInstance, service: SettingsService): void {
  app.get('/settings', async () => service.get())

  app.patch('/settings', async (request) => {
    const patch = parseOrThrow(updateSettingsInputSchema, request.body)
    return service.update(patch)
  })

  app.delete<{ Params: { key: string } }>('/settings/:key', async (request) => {
    return service.reset(request.params.key)
  })
}
