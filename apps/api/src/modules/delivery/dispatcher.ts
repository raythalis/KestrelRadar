import type { DeliverySender } from './sender.ts'
import { createWebhookSender } from './sender.ts'
import { createTelegramGateway } from './telegram.ts'

/**
 * 按渠道类型分发：渠道自己带类型，发送时挑对应的发送器。
 * 要加新渠道（企业微信、Server酱之类）就在这里多一个分支。
 */
export function createDeliverySender(
  options: { fetchImpl?: typeof fetch; timeoutSeconds?: number } = {},
): DeliverySender {
  const webhook = createWebhookSender(options)
  const telegram = createTelegramGateway(options)

  return {
    send: (message) =>
      message.channel.type === 'telegram' ? telegram.send(message) : webhook.send(message),
  }
}
