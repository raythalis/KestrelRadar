import type { CreateDiscoveryInput, Discovery, UpdateDiscoveryInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { DiscoveryRepo } from './discovery.repo.ts'

export function createDiscoveryService(repo: DiscoveryRepo, groups: GroupRepo) {
  function mustGet(id: string): Discovery {
    const discovery = repo.get(id)
    if (!discovery) throw AppError.notFound('发现不存在')
    return discovery
  }

  function mustGroup(groupId: string): void {
    if (!groups.get(groupId)) throw AppError.notFound('分组不存在')
  }

  return {
    list: (): Discovery[] => repo.list(),

    get: (id: string): Discovery => mustGet(id),

    create: (input: CreateDiscoveryInput): Discovery => {
      mustGroup(input.groupId)
      return repo.create(input)
    },

    update: (id: string, patch: UpdateDiscoveryInput): Discovery => {
      mustGet(id)
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('发现不存在')
      return updated
    },

    remove: (id: string): void => {
      mustGet(id)
      repo.remove(id)
    },
  }
}

export type DiscoveryService = ReturnType<typeof createDiscoveryService>
