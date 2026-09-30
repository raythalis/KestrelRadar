import type { Channel } from '@kestrel/contracts'

export interface DeliverableMessage {
  channel: Channel
  /** 渠道密钥，只在这里用一次，不外传 */
  secret: string | null
  text: string
  title: string
  url: string | null
  sourceCount: number
  eventCount: number
  hitAt: string | null
}

export interface DeliverySender {
  send(message: DeliverableMessage): Promise<void>
}

export class DeliveryError extends Error {}

/** Webhook：往渠道里配的地址 POST 一个 JSON；密钥放在 Authorization: Bearer 头里 */
export function createWebhookSender(
  options: { fetchImpl?: typeof fetch; timeoutSeconds?: number } = {},
): DeliverySender {
  const doFetch = options.fetchImpl ?? fetch
  const timeoutSeconds = options.timeoutSeconds ?? 15

  return {
    async send(message: DeliverableMessage): Promise<void> {
      if (message.channel.type !== 'webhook') {
        throw new DeliveryError(`v1.0 还没接 ${message.channel.type} 渠道，先只做 Webhook`)
      }
      const url = message.channel.config.url
      if (!url) throw new DeliveryError('这个 Webhook 渠道还没填地址')

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000)
      try {
        const response = await doFetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(message.secret ? { authorization: `Bearer ${message.secret}` } : {}),
          },
          body: JSON.stringify({
            text: message.text,
            title: message.title,
            url: message.url,
            sourceCount: message.sourceCount,
            eventCount: message.eventCount,
            hitAt: message.hitAt,
          }),
          signal: controller.signal,
        })
        if (!response.ok) throw new DeliveryError(`Webhook 返回 ${response.status}`)
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw new DeliveryError('Webhook 超时')
        if (error instanceof DeliveryError) throw error
        throw new DeliveryError((error as Error).message || 'Webhook 发送失败')
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
