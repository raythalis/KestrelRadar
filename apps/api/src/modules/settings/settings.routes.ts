import { updateSettingsInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { SettingsService } from './settings.service.ts'

export function registerSettingsRoutes(
  app: FastifyInstance,
  service: SettingsService,
  onScheduleChanged: () => void,
): void {
  app.get('/settings', async () => service.get())

  app.patch('/settings', async (request) => {
    const patch = parseOrThrow(updateSettingsInputSchema, request.body)
    const saved = service.update(patch)
    // 时区等设置会改变定时任务的下次运行时间：保存后立刻重排
    onScheduleChanged()
    return saved
  })

  app.delete<{ Params: { key: string } }>('/settings/:key', async (request) => {
    const saved = service.reset(request.params.key)
    onScheduleChanged()
    return saved
  })
}
