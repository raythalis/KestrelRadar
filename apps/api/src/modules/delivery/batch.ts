import { DeliveryError, type DeliverableMessage, type DeliverySender } from './sender.ts'

/** 同一轮里发往同一个渠道实例的多条消息，几秒内合并成一条外发，避免同一秒刷屏 */
export const CHANNEL_BATCH_WINDOW_MS = 3000

interface Bucket {
  messages: DeliverableMessage[]
  waiters: { resolve: () => void; reject: (error: Error) => void }[]
  timer: NodeJS.Timeout
}

export function createChannelBatcher(sender: DeliverySender, windowMs = CHANNEL_BATCH_WINDOW_MS) {
  const pending = new Map<string, Bucket>()

  async function flushChannel(channelKey: string): Promise<void> {
    const bucket = pending.get(channelKey)
    if (!bucket) return
    pending.delete(channelKey)
    clearTimeout(bucket.timer)

    const first = bucket.messages[0]
    if (!first) return
    const text = bucket.messages.map((message) => message.text).join('\n\n---\n\n')
    try {
      await sender.send({
        ...first,
        text,
        eventCount: bucket.messages.reduce((total, message) => total + message.eventCount, 0),
      })
      for (const waiter of bucket.waiters) waiter.resolve()
    } catch (error) {
      const failure =
        error instanceof DeliveryError ? error : new DeliveryError((error as Error).message)
      for (const waiter of bucket.waiters) waiter.reject(failure)
    }
  }

  return {
    /** 排进窗口；整批发完（或失败）后 promise 才落地 */
    enqueue(message: DeliverableMessage): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        const key = message.channel.id
        const existing = pending.get(key)
        if (existing) {
          existing.messages.push(message)
          existing.waiters.push({ resolve, reject })
          return
        }
        const timer = setTimeout(() => {
          void flushChannel(key)
        }, windowMs)
        timer.unref()
        pending.set(key, { messages: [message], waiters: [{ resolve, reject }], timer })
      })
    },

    /** 立刻把攒着的都发掉（测试与服务关闭时用） */
    async flush(): Promise<void> {
      for (const key of pending.keys()) await flushChannel(key)
    },
  }
}

export type ChannelBatcher = ReturnType<typeof createChannelBatcher>
