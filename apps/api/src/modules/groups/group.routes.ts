import { createGroupInputSchema, updateGroupInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { GroupService } from './group.service.ts'

interface IdParams {
  id: string
}

export function registerGroupRoutes(
  app: FastifyInstance,
  service: GroupService,
  onScheduleChanged: () => void,
): void {
  app.get('/groups', async () => service.list())

  app.get<{ Params: IdParams }>('/groups/:id', async (request) => service.get(request.params.id))

  app.post('/groups', async (request, reply) => {
    const input = parseOrThrow(createGroupInputSchema, request.body)
    return reply.status(201).send(service.create(input))
  })

  app.patch<{ Params: IdParams }>('/groups/:id', async (request) => {
    const patch = parseOrThrow(updateGroupInputSchema, request.body)
    const updated = service.update(request.params.id, patch)
    onScheduleChanged()
    return updated
  })

  app.delete<{ Params: IdParams }>('/groups/:id', async (request, reply) => {
    service.remove(request.params.id)
    onScheduleChanged()
    return reply.status(204).send()
  })
}
