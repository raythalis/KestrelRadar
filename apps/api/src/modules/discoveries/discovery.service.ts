import type { CreateDiscoveryInput, Discovery, UpdateDiscoveryInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import { isValidCron } from '../collection/scheduler.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { DiscoveryRepo } from './discovery.repo.ts'

/** 卡片上的「下次采集时间」由调度器提供，不入库 */
export interface DiscoveryScheduleView {
  nextRunAt: (discoveryId: string) => string | null
}

export function createDiscoveryService(
  repo: DiscoveryRepo,
  groups: GroupRepo,
  schedule?: DiscoveryScheduleView,
) {
  function mustGet(id: string): Discovery {
    const discovery = repo.get(id)
    if (!discovery) throw AppError.notFound('发现不存在')
    return discovery
  }

  function mustGroup(groupId: string): void {
    if (!groups.get(groupId)) throw AppError.notFound('分组不存在')
  }

  function assertCron(cronExpression: string): void {
    if (!isValidCron(cronExpression)) {
      throw AppError.validation('定时表达式不合法，例如「0 * * * *」表示每小时整点看一次')
    }
  }

  function withSchedule(discovery: Discovery): Discovery {
    return { ...discovery, nextRunAt: schedule?.nextRunAt(discovery.id) ?? null }
  }

  return {
    list: (): Discovery[] => repo.list().map(withSchedule),

    get: (id: string): Discovery => withSchedule(mustGet(id)),

    create: (input: CreateDiscoveryInput): Discovery => {
      mustGroup(input.groupId)
      assertCron(input.cronExpression)
      return withSchedule(repo.create(input))
    },

    update: (id: string, patch: UpdateDiscoveryInput): Discovery => {
      mustGet(id)
      if (patch.cronExpression !== undefined) assertCron(patch.cronExpression)
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('发现不存在')
      return withSchedule(updated)
    },

    remove: (id: string): void => {
      mustGet(id)
      repo.remove(id)
    },
  }
}

export type DiscoveryService = ReturnType<typeof createDiscoveryService>
