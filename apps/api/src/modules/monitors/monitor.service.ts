import type { CreateMonitorInput, Monitor, UpdateMonitorInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ActionRepo } from '../actions/action.repo.ts'
import type { GroupGate } from '../groups/group-gate.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { MonitorRepo } from './monitor.repo.ts'

export function createMonitorService(
  repo: MonitorRepo,
  groups: GroupRepo,
  actions: ActionRepo,
  gate: GroupGate,
) {
  function mustGet(id: string): Monitor {
    const monitor = repo.get(id)
    if (!monitor) throw AppError.notFound('监听不存在')
    return monitor
  }

  /** 监听只能在「自己的分组的动作」里挑，避免跨分组的隐形依赖 */
  function assertActionsUsable(groupId: string, actionIds: string[]): void {
    for (const actionId of actionIds) {
      const action = actions.get(actionId)
      if (!action) throw AppError.validation(`动作不存在：${actionId}`)
      if (action.groupId !== groupId) throw AppError.validation('只能绑定同一个分组里的动作')
    }
  }

  return {
    list: (): Monitor[] => repo.list(),

    get: (id: string): Monitor => mustGet(id),

    create: (input: CreateMonitorInput): Monitor => {
      if (!groups.get(input.groupId)) throw AppError.notFound('分组不存在')
      assertActionsUsable(input.groupId, input.actionIds)
      const created = repo.create(input)
      gate.inheritOnCreate(created.groupId, { kind: 'monitor', id: created.id })
      return mustGet(created.id)
    },

    update: (id: string, patch: UpdateMonitorInput): Monitor => {
      const current = mustGet(id)
      if (patch.actionIds !== undefined) assertActionsUsable(current.groupId, patch.actionIds)
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('监听不存在')
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

export type MonitorService = ReturnType<typeof createMonitorService>
