import {
  CRON_MESSAGE,
  isValidCronExpression,
  type Action,
  type CreateActionInput,
  type UpdateActionInput,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ChannelRepo } from '../channels/channel.repo.ts'
import type { GroupGate } from '../groups/group-gate.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { ActionRepo } from './action.repo.ts'

export function createActionService(
  repo: ActionRepo,
  groups: GroupRepo,
  channels: ChannelRepo,
  gate: GroupGate,
) {
  function mustGet(id: string): Action {
    const action = repo.get(id)
    if (!action) throw AppError.notFound('动作不存在')
    return action
  }

  function mustChannel(channelId: string): void {
    if (!channels.get(channelId)) throw AppError.notFound('渠道不存在')
  }

  /** 汇总动作必须有合法 cron；即时动作不看这个字段 */
  function assertCron(triggerType: Action['triggerType'], cronExpression: string | null): void {
    if (triggerType !== 'digest') return
    const cron = cronExpression?.trim() ?? ''
    if (!cron) throw AppError.validation('汇总动作要填汇总时间，例如「0 9 * * *」表示每天 09:00')
    if (!isValidCronExpression(cron)) throw AppError.validation(CRON_MESSAGE)
  }

  return {
    list: (): Action[] => repo.list(),

    get: (id: string): Action => mustGet(id),

    create: (input: CreateActionInput): Action => {
      if (!groups.get(input.groupId)) throw AppError.notFound('分组不存在')
      mustChannel(input.channelId)
      assertCron(input.triggerType, input.cronExpression)
      const created = repo.create(input)
      gate.inheritOnCreate(created.groupId, { kind: 'action', id: created.id })
      return mustGet(created.id)
    },

    update: (id: string, patch: UpdateActionInput): Action => {
      const current = mustGet(id)
      if (patch.channelId !== undefined) mustChannel(patch.channelId)
      if (patch.triggerType !== undefined || patch.cronExpression !== undefined) {
        assertCron(
          patch.triggerType ?? current.triggerType,
          patch.cronExpression ?? current.cronExpression,
        )
      }
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('动作不存在')
      if (patch.enabled !== undefined) gate.syncFromChildren(updated.groupId)
      return updated
    },

    remove: (id: string): void => {
      const current = mustGet(id)
      repo.remove(id)
      gate.syncFromChildren(current.groupId)
    },
  }
}

export type ActionService = ReturnType<typeof createActionService>
