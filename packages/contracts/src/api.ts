import { z } from 'zod'

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

export const ERROR_CODES = ['validation_error', 'not_found', 'conflict', 'internal'] as const
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
