import { createDiscoveryInputSchema, updateDiscoveryInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import type { Collector } from '../collection/collector.ts'
import { parseOrThrow } from '../../utils/parse.ts'
import type { DiscoveryService } from './discovery.service.ts'

interface IdParams {
  id: string
}

export function registerDiscoveryRoutes(
  app: FastifyInstance,
  service: DiscoveryService,
  collector: Collector,
): void {
  app.get('/discoveries', async () => service.list())

  /** 手动测试：只探测连通性，不写条目（添加发现时的首次校验也走这条） */
  app.post<{ Params: IdParams }>('/discoveries/:id/test', async (request) => {
    service.get(request.params.id)
    return collector.probeDiscovery(request.params.id)
  })

  app.get<{ Params: IdParams }>('/discoveries/:id', async (request) =>
    service.get(request.params.id),
  )

  app.post('/discoveries', async (request, reply) => {
    const input = parseOrThrow(createDiscoveryInputSchema, request.body)
    return reply.status(201).send(service.create(input))
  })

  app.patch<{ Params: IdParams }>('/discoveries/:id', async (request) => {
    const patch = parseOrThrow(updateDiscoveryInputSchema, request.body)
    return service.update(request.params.id, patch)
  })

  app.delete<{ Params: IdParams }>('/discoveries/:id', async (request, reply) => {
    service.remove(request.params.id)
    return reply.status(204).send()
  })
}
