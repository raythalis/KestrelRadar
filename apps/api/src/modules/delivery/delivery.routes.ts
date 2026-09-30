import type { FastifyInstance } from 'fastify'

import type { DeliveryService } from './delivery.service.ts'

/** 渠道连通性测试：真有副作用（会发一条消息），所以只能手动点 */
export function registerDeliveryRoutes(app: FastifyInstance, service: DeliveryService): void {
  app.post<{ Params: { id: string } }>('/channels/:id/test', async (request) =>
    service.testChannel(request.params.id),
  )
}
