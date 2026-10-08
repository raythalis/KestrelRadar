import { previewRequestSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { JudgeService } from './judge.service.ts'

/** 规则预览挂在监听下面：试跑的是「这条监听的规则」 */
export function registerJudgmentRoutes(app: FastifyInstance, service: JudgeService): void {
  app.post<{ Params: { id: string } }>('/monitors/:id/preview', async (request) => {
    const input = parseOrThrow(previewRequestSchema, request.body ?? {})
    return service.preview(request.params.id, input)
  })
}
