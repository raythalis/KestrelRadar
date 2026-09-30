import {
  createMessageTemplateInputSchema,
  updateMessageTemplateInputSchema,
} from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { TemplateService } from './template.service.ts'

export function registerTemplateRoutes(app: FastifyInstance, service: TemplateService): void {
  app.get('/templates', async () => service.list())

  app.post('/templates', async (request, reply) => {
    const input = parseOrThrow(createMessageTemplateInputSchema, request.body)
    return reply.status(201).send(service.create(input))
  })

  app.patch<{ Params: { id: string } }>('/templates/:id', async (request) => {
    const patch = parseOrThrow(updateMessageTemplateInputSchema, request.body)
    return service.update(request.params.id, patch)
  })

  app.delete<{ Params: { id: string } }>('/templates/:id', async (request, reply) => {
    service.remove(request.params.id)
    return reply.status(204).send()
  })
}
