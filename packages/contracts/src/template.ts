import { z } from 'zod'

/** 系统内置模板的 id：内容固定在代码里，不可改不可删 */
export const BUILTIN_TEMPLATE_ID = 'builtin:default'

export const messageTemplateSchema = z.object({
  id: z.string().min(1).max(120),
  /** 自定义模板的别名；内置模板用它当兜底 */
  name: z.string().min(1).max(60),
  /** 内置模板的显示名走 i18n；自定义模板为 null */
  nameKey: z.string().max(120).nullable(),
  content: z.string().min(1).max(4000),
  /** 系统内置：只读 */
  builtin: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
})
export type MessageTemplate = z.infer<typeof messageTemplateSchema>

export const createMessageTemplateInputSchema = z.object({
  name: z.string().min(1).max(60),
  content: z.string().min(1).max(4000),
})
export const updateMessageTemplateInputSchema = createMessageTemplateInputSchema.partial()
export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateInputSchema>
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateInputSchema>
