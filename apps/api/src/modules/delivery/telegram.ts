import { DeliveryError, type DeliverableMessage, type DeliverySender } from './sender.ts'

export interface TelegramChat {
  id: string
  title: string
}

interface TelegramUpdate {
  message?: {
    chat?: { id: number | string; title?: string; username?: string; first_name?: string }
  }
  channel_post?: {
    chat?: { id: number | string; title?: string; username?: string; first_name?: string }
  }
}

interface TelegramResponse<T> {
  ok?: boolean
  result?: T
  description?: string
}

export interface TelegramGateway extends DeliverySender {
  /** 读这个 bot 见过的会话：让用户先把 bot 拉进群 / 给它发一句话，再点「读取会话」 */
  listChats(token: string): Promise<TelegramChat[]>
}

function chatTitle(chat: NonNullable<TelegramUpdate['message']>['chat']): string {
  if (!chat) return ''
  return (
    chat.title ??
    [chat.first_name, chat.username].filter((part) => Boolean(part)).join(' ') ??
    String(chat.id)
  )
}

/** Telegram：bot token 当密钥，chat id 放渠道参数里 */
export function createTelegramGateway(
  options: { fetchImpl?: typeof fetch; timeoutSeconds?: number } = {},
): TelegramGateway {
  const doFetch = options.fetchImpl ?? fetch
  const timeoutSeconds = options.timeoutSeconds ?? 15

  async function call<T>(token: string, method: string, body: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000)
    try {
      const response = await doFetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const payload = (await response.json().catch(() => null)) as TelegramResponse<T> | null
      if (!response.ok || !payload?.ok) {
        const reason = payload?.description ?? `HTTP ${response.status}`
        throw new DeliveryError(
          response.status === 401 ? `bot token 不对：${reason}` : `Telegram 说：${reason}`,
        )
      }
      return payload.result as T
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new DeliveryError('Telegram 超时')
      if (error instanceof DeliveryError) throw error
      throw new DeliveryError((error as Error).message || 'Telegram 请求失败')
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    async send(message: DeliverableMessage): Promise<void> {
      if (message.channel.type !== 'telegram') {
        throw new DeliveryError('这个渠道不是 Telegram')
      }
      const token = message.secret
      if (!token) throw new DeliveryError('这个 Telegram 渠道还没填 bot token')
      const chatId = message.channel.config.chatId
      if (!chatId) throw new DeliveryError('这个 Telegram 渠道还没选会话（chat id）')
      await call(token, 'sendMessage', {
        chat_id: chatId,
        text: message.text,
        disable_web_page_preview: true,
      })
    },

    async listChats(token: string): Promise<TelegramChat[]> {
      if (!token.trim()) throw new DeliveryError('先填 bot token 再读取会话')
      const updates = await call<TelegramUpdate[]>(token, 'getUpdates', {
        limit: 100,
        allowed_updates: ['message', 'channel_post'],
      })
      const seen = new Map<string, TelegramChat>()
      for (const update of updates ?? []) {
        const chat = update.message?.chat ?? update.channel_post?.chat
        if (!chat) continue
        const id = String(chat.id)
        if (!seen.has(id)) seen.set(id, { id, title: chatTitle(chat) })
      }
      return [...seen.values()]
    },
  }
}
