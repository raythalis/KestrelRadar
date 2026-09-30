import type { Channel, CreateChannelInput, UpdateChannelInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ChannelRepo } from './channel.repo.ts'

export function createChannelService(repo: ChannelRepo) {
  function mustGet(id: string): Channel {
    const channel = repo.get(id)
    if (!channel) throw AppError.notFound('渠道不存在')
    return channel
  }

  return {
    list: (): Channel[] => repo.list(),

    get: (id: string): Channel => mustGet(id),

    create: (input: CreateChannelInput): Channel => repo.create(input),

    update: (id: string, patch: UpdateChannelInput): Channel => {
      mustGet(id)
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
