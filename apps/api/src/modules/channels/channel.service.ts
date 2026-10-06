import {
  isHttpUrl,
  type Channel,
  type CreateChannelInput,
  type UpdateChannelInput,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ChannelRepo } from './channel.repo.ts'

export function createChannelService(repo: ChannelRepo) {
  function mustGet(id: string): Channel {
    const channel = repo.get(id)
    if (!channel) throw AppError.notFound('渠道不存在')
    return channel
  }

  /**
   * 渠道形状按类型分支（长度限制在契约里，这里管「必填 × 形状」）：
   * - webhook：config.url 必须是 http(s) 地址
   * - telegram：必须有 chat id，且库里有 token 或这次传了新 token
   */
  function assertShape(
    type: Channel['type'],
    config: Record<string, string>,
    token: string,
    hasToken: boolean,
  ): void {
    if (type === 'webhook') {
      if (!isHttpUrl(config.url ?? '')) {
        throw AppError.validation('Webhook 渠道要填一个 http:// 或 https:// 开头的地址')
      }
      return
    }
    if (type === 'telegram') {
      if (!(config.chatId ?? '').trim()) throw AppError.validation('Telegram 渠道要填 chat id')
      if (!token.trim() && !hasToken) throw AppError.validation('Telegram 渠道要填 bot token')
    }
  }

  return {
    list: (): Channel[] => repo.list(),

    get: (id: string): Channel => mustGet(id),

    create: (input: CreateChannelInput): Channel => {
      assertShape(input.type, input.config, input.secret ?? '', false)
      return repo.create(input)
    },

    update: (id: string, patch: UpdateChannelInput): Channel => {
      const current = mustGet(id)
      if (patch.type !== undefined || patch.config !== undefined || patch.secret !== undefined) {
        assertShape(
          patch.type ?? current.type,
          patch.config ?? current.config,
          patch.secret ?? '',
          patch.secret === undefined ? current.hasSecret : false,
        )
      }
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('渠道不存在')
      return updated
    },

    /** 还被动作引用时数据库会拒绝，接口层翻译成 409 */
    remove: (id: string): void => {
      mustGet(id)
      repo.remove(id)
    },
  }
}

export type ChannelService = ReturnType<typeof createChannelService>
