import { createMonitorInputSchema, updateMonitorInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { MonitorService } from './monitor.service.ts'

export function registerMonitorRoutes(app: FastifyInstance, service: MonitorService): void {
  app.get('/monitors', async () => service.list())

  app.get<{ Params: { id: string } }>('/monitors/:id', async (request) =>
    service.get(request.params.id),
  )

  app.post('/monitors', async (request, reply) => {
    const input = parseOrThrow(createMonitorInputSchema, request.body)
    return reply.status(201).send(service.create(input))
  })

  app.patch<{ Params: { id: string } }>('/monitors/:id', async (request) => {
    const patch = parseOrThrow(updateMonitorInputSchema, request.body)
    return service.update(request.params.id, patch)
  })

  app.delete<{ Params: { id: string } }>('/monitors/:id', async (request, reply) => {
    service.remove(request.params.id)
    return reply.status(204).send()
  })
}
