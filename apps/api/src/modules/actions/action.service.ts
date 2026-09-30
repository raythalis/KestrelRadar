import type { Action, CreateActionInput, UpdateActionInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ChannelRepo } from '../channels/channel.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { ActionRepo } from './action.repo.ts'

export function createActionService(repo: ActionRepo, groups: GroupRepo, channels: ChannelRepo) {
  function mustGet(id: string): Action {
    const action = repo.get(id)
    if (!action) throw AppError.notFound('动作不存在')
    return action
  }

  function mustChannel(channelId: string): void {
    if (!channels.get(channelId)) throw AppError.notFound('渠道不存在')
  }

  return {
    list: (): Action[] => repo.list(),

    get: (id: string): Action => mustGet(id),

    create: (input: CreateActionInput): Action => {
      if (!groups.get(input.groupId)) throw AppError.notFound('分组不存在')
      mustChannel(input.channelId)
      return repo.create(input)
    },

    update: (id: string, patch: UpdateActionInput): Action => {
      mustGet(id)
      if (patch.channelId !== undefined) mustChannel(patch.channelId)
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('动作不存在')
      return updated
    },

    remove: (id: string): void => {
      mustGet(id)
      repo.remove(id)
    },
  }
}

export type ActionService = ReturnType<typeof createActionService>
