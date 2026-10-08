import { createModelProviderInputSchema, updateModelProviderInputSchema } from '@kestrel/contracts'
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

  // 现场问供应商有哪些模型（下拉用）；问不到就返回空数组，界面上静默
  app.get<{ Params: { id: string } }>('/model-providers/:id/available-models', async (request) =>
    service.availableModels(request.params.id),
  )
}
