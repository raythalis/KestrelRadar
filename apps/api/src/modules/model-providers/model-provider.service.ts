import type {
  CreateModelProviderInput,
  ModelProvider,
  UpdateModelProviderInput,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { ModelProviderRepo } from './model-provider.repo.ts'
import type { RemoteModels } from './remote-models.ts'

export function createModelProviderService(repo: ModelProviderRepo, remote: RemoteModels) {
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

    /** 现场问供应商有哪些模型；问不到就是空数组（界面上静默不显示这一家） */
    availableModels: async (id: string): Promise<{ models: string[] }> => {
      const provider = mustGetProvider(id)
      return { models: await remote.list(provider, repo.readApiKey(provider.id)) }
    },
  }
}

export type ModelProviderService = ReturnType<typeof createModelProviderService>
