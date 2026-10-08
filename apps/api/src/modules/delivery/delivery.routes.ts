import { telegramChatsInputSchema } from '@kestrel/contracts'
import type { FastifyInstance } from 'fastify'

import { parseOrThrow } from '../../utils/parse.ts'
import type { DeliveryService } from './delivery.service.ts'

/** 渠道连通性测试：真有副作用（会发一条消息），所以只能手动点 */
export function registerDeliveryRoutes(app: FastifyInstance, service: DeliveryService): void {
  app.post<{ Params: { id: string } }>('/channels/:id/test', async (request) => ({
    success: true,
    data: await service.testChannel(request.params.id),
  }))

  /** 读取会话：给 token 或给渠道 id（用库里存的 token），返回 bot 见过的 chat 列表 */
  app.post('/channels/telegram/chats', async (request) => {
    const input = parseOrThrow(telegramChatsInputSchema, request.body)
    return { success: true, data: await service.listTelegramChats(input) }
  })
}
