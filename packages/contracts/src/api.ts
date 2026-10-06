import { z } from 'zod'

import { trimmedText } from './validation.ts'

import {
  actionSchema,
  channelSchema,
  discoverySchema,
  groupSchema,
  modelProviderSchema,
  modelSchema,
  monitorSchema,
} from './entities.ts'
import { settingsSchema } from './settings.ts'
import { messageTemplateSchema } from './template.ts'

/** 接口前缀：全站一个，改这里就够 */
export const API_PREFIX = '/api'

export const ERROR_CODES = [
  'validation_error',
  'not_found',
  'conflict',
  'delivery_error',
  'internal',
] as const
export const errorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>

/** 前端一次拉全量的只读快照 */
export const configSnapshotSchema = z.object({
  groups: z.array(groupSchema),
  discoveries: z.array(discoverySchema),
  monitors: z.array(monitorSchema),
  actions: z.array(actionSchema),
  channels: z.array(channelSchema),
  modelProviders: z.array(modelProviderSchema),
  models: z.array(modelSchema),
  templates: z.array(messageTemplateSchema),
  settings: settingsSchema,
})
export type ConfigSnapshot = z.infer<typeof configSnapshotSchema>

/** Telegram 会话（读取会话按钮的结果） */
export const telegramChatSchema = z.object({
  id: z.string(),
  title: z.string(),
})
export type TelegramChat = z.infer<typeof telegramChatSchema>

/** 读会话时给 token，或者给一个已保存的渠道 id（用库里那份 token） */
export const telegramChatsInputSchema = z
  .object({
    token: trimmedText(200).optional(),
    channelId: trimmedText(120).optional(),
  })
  .refine((value) => Boolean(value.token?.trim()) || Boolean(value.channelId), {
    message: '要么给 bot token，要么给一个渠道 id',
  })
export type TelegramChatsInput = z.infer<typeof telegramChatsInputSchema>

/** 渠道连通性测试的结果 */
export const channelTestResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  sentAt: z.string().nullable(),
})
export type ChannelTestResult = z.infer<typeof channelTestResultSchema>
