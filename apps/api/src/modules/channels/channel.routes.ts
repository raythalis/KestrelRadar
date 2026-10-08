import { createChannelInputSchema, updateChannelInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { ChannelService } from './channel.service.ts'

interface IdParams {
  id: string
}

export function registerChannelRoutes(app: FastifyInstance, service: ChannelService): void {
  app.get('/channels', async () => service.list())

  app.get<{ Params: IdParams }>('/channels/:id', async (request) => service.get(request.params.id))

  app.post('/channels', async (request, reply) => {
    const input = parseOrThrow(createChannelInputSchema, request.body)
    return reply.status(201).send(service.create(input))
  })

  app.patch<{ Params: IdParams }>('/channels/:id', async (request) => {
    const patch = parseOrThrow(updateChannelInputSchema, request.body)
    return service.update(request.params.id, patch)
  })

  app.delete<{ Params: IdParams }>('/channels/:id', async (request, reply) => {
    service.remove(request.params.id)
    return reply.status(204).send()
  })
}
