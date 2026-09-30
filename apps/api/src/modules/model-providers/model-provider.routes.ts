import {
  createModelInputSchema,
  createModelProviderInputSchema,
  updateModelInputSchema,
  updateModelProviderInputSchema,
} from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { ModelProviderService } from './model-provider.service.ts'

export function registerModelProviderRoutes(
  app: FastifyInstance,
  service: ModelProviderService,
): void {
  app.get('/model-providers', async () => service.listProviders())
  app.get<{ Params: { id: string } }>('/model-providers/:id', async (request) =>
    service.getProvider(request.params.id),
  )

  app.post('/model-providers', async (request, reply) => {
    const input = parseOrThrow(createModelProviderInputSchema, request.body)
    return reply.status(201).send(service.createProvider(input))
  })

  app.patch<{ Params: { id: string } }>('/model-providers/:id', async (request) => {
    const patch = parseOrThrow(updateModelProviderInputSchema, request.body)
    return service.updateProvider(request.params.id, patch)
  })

  app.delete<{ Params: { id: string } }>('/model-providers/:id', async (request, reply) => {
    service.removeProvider(request.params.id)
    return reply.status(204).send()
  })

  app.get('/models', async () => service.listModels())

  app.post<{ Params: { id: string } }>('/model-providers/:id/models', async (request, reply) => {
    const input = parseOrThrow(createModelInputSchema, request.body)
    return reply.status(201).send(service.addModel(request.params.id, input))
  })

  app.patch<{ Params: { id: string } }>('/models/:id', async (request) => {
    const patch = parseOrThrow(updateModelInputSchema, request.body)
    return service.updateModel(request.params.id, patch)
  })

  app.delete<{ Params: { id: string } }>('/models/:id', async (request, reply) => {
    service.removeModel(request.params.id)
    return reply.status(204).send()
  })
}
