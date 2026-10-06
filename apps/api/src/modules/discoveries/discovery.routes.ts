import { createDiscoveryInputSchema, updateDiscoveryInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import type { Collector } from '../collection/collector.ts'
import type { IconService } from '../icons/icon.service.ts'
import { parseOrThrow } from '../../utils/parse.ts'
import type { DiscoveryService } from './discovery.service.ts'

interface IdParams {
  id: string
}

export function registerDiscoveryRoutes(
  app: FastifyInstance,
  service: DiscoveryService,
  collector: Collector,
  onScheduleChanged: () => void,
  icons?: IconService,
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
    const created = service.create(input)
    onScheduleChanged()
    // 顺手抓一次图标：最多等 1.5 秒，抓不到就先回落类型图标（后台继续抓）
    if (icons) await icons.refresh(created.id, { waitMs: 1500 })
    return reply.status(201).send(service.get(created.id))
  })

  app.patch<{ Params: IdParams }>('/discoveries/:id', async (request) => {
    const patch = parseOrThrow(updateDiscoveryInputSchema, request.body)
    const before = service.get(request.params.id)
    service.update(request.params.id, patch)
    onScheduleChanged()
    const after = service.get(request.params.id)
    const targetChanged = after.target !== before.target || after.kind !== before.kind
    if (icons) {
      // 目标换了图标就过期了：不等结果，抓到再刷新
      if (targetChanged) void icons.refresh(after.id, { waitMs: 0 })
      // 还没抓到过图标的（图标功能上线前建的老源）：这次等一小会儿，保存返回就带图
      else if (!after.iconUrl) await icons.refresh(after.id, { waitMs: 1500 })
    }
    return service.get(after.id)
  })

  /** 手动重新抓图标（编辑弹窗里那顆按钮） */
  app.post<{ Params: IdParams }>('/discoveries/:id/icon', async (request) => {
    service.get(request.params.id)
    if (icons) await icons.refresh(request.params.id, { waitMs: 5000 })
    return service.get(request.params.id)
  })

  app.delete<{ Params: IdParams }>('/discoveries/:id', async (request, reply) => {
    service.remove(request.params.id)
    onScheduleChanged()
    return reply.status(204).send()
  })
}
