import { failureCopy, type Channel, type FailureCode } from '@kestrel/contracts'

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

/** 超时秒数：给数字就是固定值，给函数表示每次发送时现取（设置改了立刻生效） */
export type TimeoutOption = number | (() => number)

export function resolveTimeout(option: TimeoutOption | undefined, fallback: number): number {
  if (typeof option === 'function') {
    const value = option()
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  return typeof option === 'number' && option > 0 ? option : fallback
}

/** 投递失败：带错误码，异常记录拿它分类；文案默认从失败文案表里取 */
export class DeliveryError extends Error {
  readonly code: FailureCode

  constructor(code: FailureCode, message?: string) {
    super(message ?? failureCopy(code))
    this.name = 'DeliveryError'
    this.code = code
  }
}

/** Webhook：往渠道里配的地址 POST 一个 JSON；密钥放在 Authorization: Bearer 头里 */
export function createWebhookSender(
  options: { fetchImpl?: typeof fetch; timeoutSeconds?: TimeoutOption } = {},
): DeliverySender {
  const doFetch = options.fetchImpl ?? fetch

  return {
    async send(message: DeliverableMessage): Promise<void> {
      if (message.channel.type !== 'webhook') {
        throw new DeliveryError(
          'delivery.channelUnavailable',
          `v1.0 还没接 ${message.channel.type} 渠道，先只做 Webhook`,
        )
      }
      const url = message.channel.config.url
      if (!url) throw new DeliveryError('delivery.webhookNoUrl')

      const timeoutSeconds = resolveTimeout(options.timeoutSeconds, 15)
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
        if (!response.ok)
          throw new DeliveryError(
            'delivery.webhookStatus',
            failureCopy('delivery.webhookStatus', { status: response.status }),
          )
      } catch (error) {
        if ((error as Error).name === 'AbortError')
          throw new DeliveryError('delivery.webhookTimeout')
        if (error instanceof DeliveryError) throw error
        throw new DeliveryError(
          'delivery.webhookFailed',
          (error as Error).message || failureCopy('delivery.webhookFailed'),
        )
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
