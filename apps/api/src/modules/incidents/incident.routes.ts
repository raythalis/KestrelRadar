import type { FastifyInstance } from 'fastify'

import type { IncidentService } from './incident.service.ts'

/**
 * 异常列表与忽视。
 * 列表返回的是「库里最近 n 条里没被忽视的那些」，n 与库上限是同一个隐藏配置项。
 */
export function registerIncidentRoutes(app: FastifyInstance, service: IncidentService): void {
  app.get('/incidents', async () => service.list())

  app.post<{ Params: { id: string } }>('/incidents/:id/dismiss', async (request) => {
    return service.dismiss(request.params.id)
  })
}
