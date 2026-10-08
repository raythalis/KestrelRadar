import { createActionInputSchema, updateActionInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { ActionService } from './action.service.ts'

export function registerActionRoutes(app: FastifyInstance, service: ActionService): void {
  app.get('/actions', async () => service.list())

  app.get<{ Params: { id: string } }>('/actions/:id', async (request) =>
    service.get(request.params.id),
  )

  app.post('/actions', async (request, reply) => {
    const input = parseOrThrow(createActionInputSchema, request.body)
    return reply.status(201).send(service.create(input))
  })

  app.patch<{ Params: { id: string } }>('/actions/:id', async (request) => {
    const patch = parseOrThrow(updateActionInputSchema, request.body)
    return service.update(request.params.id, patch)
  })

  app.delete<{ Params: { id: string } }>('/actions/:id', async (request, reply) => {
    service.remove(request.params.id)
    return reply.status(204).send()
  })
}
