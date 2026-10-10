import type { DeliverySender } from './sender.ts'
import { createWebhookSender, type TimeoutOption } from './sender.ts'
import { createTelegramGateway } from './telegram.ts'
import {
  createDingtalkSender,
  createEmailSender,
  createFeishuSender,
  createWecomSender,
} from './extra-senders.ts'

/**
 * 按渠道类型分发：渠道自己带类型，发送时挑对应的发送器。
 * 要加新渠道（企业微信、Server酱之类）就在这里多一个分支。
 */
export function createDeliverySender(
  options: { fetchImpl?: typeof fetch; timeoutSeconds?: TimeoutOption } = {},
): DeliverySender {
  const webhook = createWebhookSender(options)
  const telegram = createTelegramGateway(options)
  const wecom = createWecomSender(options)
  const dingtalk = createDingtalkSender(options)
  const feishu = createFeishuSender(options)
  const email = createEmailSender(options)

  return {
    send: (message) => {
      switch (message.channel.type) {
        case 'telegram':
          return telegram.send(message)
        case 'webhook':
          return webhook.send(message)
        case 'wecom':
          return wecom.send(message)
        case 'dingtalk':
          return dingtalk.send(message)
        case 'feishu':
          return feishu.send(message)
        case 'email':
          return email.send(message)
      }
    },
  }
}
