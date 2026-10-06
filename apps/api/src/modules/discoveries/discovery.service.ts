import {
  CRON_MESSAGE,
  isValidCronExpression,
  isValidDiscoveryTarget,
  type CreateDiscoveryInput,
  type Discovery,
  type UpdateDiscoveryInput,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { GroupGate } from '../groups/group-gate.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { DiscoveryRepo } from './discovery.repo.ts'

/** 卡片上的「下次采集时间」由调度器提供，不入库 */
export interface DiscoveryScheduleView {
  nextRunAt: (discoveryId: string) => string | null
}

export function createDiscoveryService(
  repo: DiscoveryRepo,
  groups: GroupRepo,
  gate: GroupGate,
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
    if (!isValidCronExpression(cronExpression)) throw AppError.validation(CRON_MESSAGE)
  }

  /** 目标形状：rss / web 必须是 http(s) 地址，rsshub 还允许相对路由 */
  function assertTarget(target: string, kind: Discovery['kind']): void {
    if (!isValidDiscoveryTarget(target, kind)) {
      throw AppError.validation(
        '目标要写成 http:// 或 https:// 开头的地址；RSSHub 路由可以写成 /命名空间/路由',
      )
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
      assertTarget(input.target, input.kind)
      const created = repo.create(input)
      gate.inheritOnCreate(created.groupId, { kind: 'discovery', id: created.id })
      return withSchedule(mustGet(created.id))
    },

    update: (id: string, patch: UpdateDiscoveryInput): Discovery => {
      const current = mustGet(id)
      if (patch.cronExpression !== undefined) assertCron(patch.cronExpression)
      if (patch.target !== undefined || patch.kind !== undefined) {
        assertTarget(patch.target ?? current.target, patch.kind ?? current.kind)
      }
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('发现不存在')
      if (patch.enabled !== undefined) gate.syncFromChildren(updated.groupId)
      return withSchedule(updated)
    },

    remove: (id: string): void => {
      const current = mustGet(id)
      repo.remove(id)
      gate.syncFromChildren(current.groupId)
    },
  }
}

export type DiscoveryService = ReturnType<typeof createDiscoveryService>
