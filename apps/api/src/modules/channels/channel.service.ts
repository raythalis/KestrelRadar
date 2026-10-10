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
   * - webhook 类：config.url 必须是 http(s) 地址
   * - telegram：必须有 chat id，且库里有 token 或这次传了新 token
   * - email：必须有 SMTP 主机、发件人、收件人和密码
   */
  function assertShape(
    type: Channel['type'],
    config: Record<string, string>,
    token: string,
    hasToken: boolean,
  ): void {
    if (type === 'webhook' || type === 'wecom' || type === 'dingtalk' || type === 'feishu') {
      if (!isHttpUrl(config.url ?? '')) {
        throw AppError.validation('Webhook 渠道要填一个 http:// 或 https:// 开头的地址', {
          field: 'config.url',
          rule: 'INVALID_URL',
        })
      }
      if (
        (type === 'dingtalk' || type === 'feishu') &&
        config.sign === 'true' &&
        !token.trim() &&
        !hasToken
      ) {
        throw AppError.validation(`${type === 'dingtalk' ? '钉钉' : '飞书'}签名模式要填密钥`, {
          field: 'secret',
          rule: 'REQUIRED_FIELD',
        })
      }
      return
    }
    if (type === 'email') {
      if (!config.host?.trim() || !config.from?.trim() || !config.to?.trim()) {
        throw AppError.validation('邮件渠道要填 SMTP 主机、发件人和收件人', {
          field: 'config',
          rule: 'REQUIRED_FIELD',
        })
      }
      if (!token.trim() && !hasToken) {
        throw AppError.validation('邮件渠道要填 SMTP 密码', {
          field: 'secret',
          rule: 'REQUIRED_FIELD',
        })
      }
      return
    }
    if (type === 'telegram') {
      if (!(config.chatId ?? '').trim()) {
        throw AppError.validation('Telegram 渠道要填 chat id', {
          field: 'config.chatId',
          rule: 'REQUIRED_FIELD',
        })
      }
      if (!token.trim() && !hasToken) {
        throw AppError.validation('Telegram 渠道要填 bot token', {
          field: 'secret',
          rule: 'REQUIRED_FIELD',
        })
      }
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
