import type { CreateGroupInput, Group, UpdateGroupInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { GroupGate } from './group-gate.ts'
import type { GroupRepo } from './group.repo.ts'

export function createGroupService(repo: GroupRepo, gate: GroupGate) {
  function mustGet(id: string): Group {
    const group = repo.get(id)
    if (!group) throw AppError.notFound('分组不存在')
    return group
  }

  return {
    list: (): Group[] => repo.list(),

    get: (id: string): Group => mustGet(id),

    create: (input: CreateGroupInput): Group => repo.create(input),

    update: (id: string, patch: UpdateGroupInput): Group => {
      mustGet(id)
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('分组不存在')
      // 分组开关往下传：关掉分组＝组内卡片一起停用，打开＝一起启用
      if (patch.enabled !== undefined) gate.applyToChildren(id, patch.enabled)
      return updated
    },

    /** 分组下的发现 / 监听 / 动作由外键级联删除 */
    remove: (id: string): void => {
      mustGet(id)
      repo.remove(id)
    },
  }
}

export type GroupService = ReturnType<typeof createGroupService>
