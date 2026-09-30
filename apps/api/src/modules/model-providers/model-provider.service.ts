import type {
  CreateModelInput,
  CreateModelProviderInput,
  Model,
  ModelProvider,
  UpdateModelInput,
  UpdateModelProviderInput,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ModelProviderRepo } from './model-provider.repo.ts'
import type { ModelRepo } from './model.repo.ts'

export function createModelProviderService(repo: ModelProviderRepo, models: ModelRepo) {
  function mustGetProvider(id: string): ModelProvider {
    const provider = repo.get(id)
    if (!provider) throw AppError.notFound('模型供应商不存在')
    return provider
  }

  return {
    listProviders: (): ModelProvider[] => repo.list(),

    getProvider: (id: string): ModelProvider => mustGetProvider(id),

    createProvider: (input: CreateModelProviderInput): ModelProvider => repo.create(input),

    updateProvider: (id: string, patch: UpdateModelProviderInput): ModelProvider => {
      mustGetProvider(id)
      const updated = repo.update(id, patch)
      if (!updated) throw AppError.notFound('模型供应商不存在')
      return updated
    },

    removeProvider: (id: string): void => {
      mustGetProvider(id)
      repo.remove(id)
    },

    listModels: (): Model[] => models.list(),

    addModel: (providerId: string, input: CreateModelInput): Model => {
      mustGetProvider(providerId)
      return models.create(providerId, input)
    },

    updateModel: (id: string, patch: UpdateModelInput): Model => {
      const updated = models.update(id, patch)
      if (!updated) throw AppError.notFound('模型不存在')
      return updated
    },

    removeModel: (id: string): void => {
      if (!models.remove(id)) throw AppError.notFound('模型不存在')
    },
  }
}

export type ModelProviderService = ReturnType<typeof createModelProviderService>
