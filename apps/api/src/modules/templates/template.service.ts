import type {
  CreateMessageTemplateInput,
  MessageTemplate,
  UpdateMessageTemplateInput,
} from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { TemplateRepo } from './template.repo.ts'
import { defaultTemplate } from './builtin.ts'

export interface TemplateServiceDeps {
  repo: TemplateRepo
  /** 系统内置模板（代码里的常量），由容器注入，避免模块互相 import */
  builtin: MessageTemplate[]
}

export function createTemplateService(deps: TemplateServiceDeps) {
  function isBuiltin(id: string): boolean {
    return deps.builtin.some((template) => template.id === id)
  }

  return {
    /** 内置在前、自定义在后 */
    list(): MessageTemplate[] {
      return [...deps.builtin, ...deps.repo.list()]
    },

    get(id: string): MessageTemplate {
      const found = this.list().find((template) => template.id === id)
      if (!found) throw AppError.notFound('没有这个模板')
      return found
    },

    create(input: CreateMessageTemplateInput): MessageTemplate {
      return deps.repo.create(input)
    },

    update(id: string, patch: UpdateMessageTemplateInput): MessageTemplate {
      if (isBuiltin(id)) throw AppError.conflict('系统内置模板不能改')
      this.get(id)
      const updated = deps.repo.update(id, patch)
      if (!updated) throw AppError.notFound('没有这个模板')
      return updated
    },

    remove(id: string): void {
      if (isBuiltin(id)) throw AppError.conflict('系统内置模板不能删')
      this.get(id)
      deps.repo.remove(id)
    },

    /** 动作没选模板（null）时，用跟随界面语言的内置模板 */
    contentFor(templateId: string | null, language: 'zh' | 'en'): string {
      if (templateId && templateId.trim().length > 0) return this.get(templateId).content
      return defaultTemplate(language)
    },
  }
}

export type TemplateService = ReturnType<typeof createTemplateService>
