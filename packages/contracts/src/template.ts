import { z } from 'zod'

/** 系统内置模板的 id：内容固定在代码里，不可改不可删 */
export const BUILTIN_TEMPLATE_IDS = { zh: 'builtin:zh', en: 'builtin:en' } as const

/** 消息模板：别名 + 内容；动作靠 id 引用它 */
export const messageTemplateSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(60),
  content: z.string().min(1).max(4000),
  /** 系统内置：界面上只读，不许改也不许删 */
  builtin: z.boolean(),
  /** 内置模板没有创建 / 修改时间 */
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
