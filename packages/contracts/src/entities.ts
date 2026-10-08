import { z } from 'zod'

import { operationResultSchema } from './operation-result.ts'

import { cronExpressionSchema, optionalCronSchema } from './cron.ts'
import {
  httpUrl,
  isValidDiscoveryTarget,
  textList,
  trimmedRequired,
  trimmedText,
} from './validation.ts'
import {
  actionTriggerSchema,
  channelTypeSchema,
  discoveryKindSchema,
  matchModeSchema,
  monitorModeSchema,
  providerKindSchema,
  sensitivitySchema,
} from './enums.ts'

const idSchema = z.string().min(1)

/** 渠道 config 里属于用户输入的键与长度上限；其它键不设限（不粗暴限制整个 record） */
const CHANNEL_CONFIG_MAX: Record<string, number> = { url: 500, chatId: 120 }

const channelConfigSchema = z
  .record(z.string(), z.string())
  .superRefine((value, ctx) => {
    for (const [key, item] of Object.entries(value)) {
      const max = CHANNEL_CONFIG_MAX[key]
      if (max !== undefined && item.trim().length > max) {
        ctx.addIssue({ code: 'custom', message: `${key} 最长 ${max} 个字符` })
      }
    }
  })
  .transform((value) =>
    Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item.trim()])),
  )
const timestampSchema = z.string()
const commonRead = {
  id: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}

/** 分组：一件关注的事，下面挂发现 / 监听 / 动作 */
export const groupSchema = z.object({
  ...commonRead,
  name: z.string().min(1).max(60),
  description: z.string().max(500),
  enabled: z.boolean(),
})
export type Group = z.infer<typeof groupSchema>

export const createGroupInputSchema = z.object({
  name: trimmedRequired(60),
  description: trimmedText(500).default(''),
  enabled: z.boolean().default(true),
})
export const updateGroupInputSchema = z.object({
  name: trimmedRequired(60).optional(),
  description: trimmedText(500).optional(),
  enabled: z.boolean().optional(),
})
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupInputSchema>

/** 发现：去哪儿看（一条路由 / 一个地址） */
export const discoverySchema = z.object({
  ...commonRead,
  groupId: idSchema,
  name: z.string().min(1).max(60),
  kind: discoveryKindSchema,
  /** RSSHub 路由、RSS 地址或网页地址，原样保存 */
  target: z.string().min(1).max(1000),
  cronExpression: z.string().min(1).max(120),
  enabled: z.boolean(),
  /** 下一次采集时间，由调度器算出来回给界面，不入库 */
  nextRunAt: z.string().nullable(),
  /** 网站图标（后端拉回来存本地，前端只读自有接口）；没抓到就是 null，界面回落类型图标 */
  iconUrl: z.string().nullable(),
  /** 下面这些是采集状态，跟着卡片一起回给界面 */
  lastCheckedAt: z.string().nullable(),
  routeOk: z.boolean().nullable(),
  contentOk: z.boolean().nullable(),
  lastCheckMessage: z.string(),
  latestItemAt: z.string().nullable(),
  itemCount: z.number().int(),
  baselineEstablishedAt: z.string().nullable(),
  baselineItemCount: z.number().int().nullable(),
})
export type Discovery = z.infer<typeof discoverySchema>

/** 发现连通性测试结果：业务结果（ok 只代表这次探测成功）+ 两级探测的细节 */
export const discoveryTestResultSchema = operationResultSchema(
  z.object({
    routeOk: z.boolean(),
    contentOk: z.boolean(),
    /** 这次探测抓到的条数（不等于库里已有的条目数） */
    foundItemCount: z.number().int(),
    latestItemAt: z.string().nullable(),
  }),
)
export type DiscoveryTestResult = z.infer<typeof discoveryTestResultSchema>

export const createDiscoveryInputSchema = z.object({
  groupId: idSchema,
  name: trimmedRequired(60),
  kind: discoveryKindSchema,
  target: trimmedRequired(1000),
  cronExpression: cronExpressionSchema(),
  enabled: z.boolean().default(true),
})
export const updateDiscoveryInputSchema = z.object({
  name: trimmedRequired(60).optional(),
  kind: discoveryKindSchema.optional(),
  target: trimmedRequired(1000).optional(),
  cronExpression: cronExpressionSchema().optional(),
  enabled: z.boolean().optional(),
})
export type CreateDiscoveryInput = z.infer<typeof createDiscoveryInputSchema>
export type UpdateDiscoveryInput = z.infer<typeof updateDiscoveryInputSchema>

/** 监听：留下什么 */
export const monitorSchema = z.object({
  ...commonRead,
  groupId: idSchema,
  name: z.string().min(1).max(60),
  mode: monitorModeSchema,
  sensitivity: sensitivitySchema,
  /** 关键词匹配方式：任意命中 或 全部命中 */
  matchMode: matchModeSchema,
  /** 语义化意图描述，仅 algorithm_llm 模式生效 */
  intentText: z.string().max(500),
  includeKeywords: z.array(z.string().min(1).max(100)).max(200),
  excludeKeywords: z.array(z.string().min(1).max(100)).max(200),
  useGlobalExcludes: z.boolean(),
  enabled: z.boolean(),
  /** 非空表示「只走这几个动作」，为空表示跟随分组 */
  actionIds: z.array(idSchema),
})
export type Monitor = z.infer<typeof monitorSchema>

export const createMonitorInputSchema = z.object({
  groupId: idSchema,
  name: trimmedRequired(60),
  mode: monitorModeSchema.default('follow_global'),
  sensitivity: sensitivitySchema.default('medium'),
  matchMode: matchModeSchema.default('any'),
  intentText: trimmedText(500).default(''),
  includeKeywords: textList(100, 200).default([]),
  excludeKeywords: textList(100, 200).default([]),
  useGlobalExcludes: z.boolean().default(true),
  enabled: z.boolean().default(true),
  actionIds: z.array(trimmedRequired(120)).max(50).default([]),
})
export const updateMonitorInputSchema = createMonitorInputSchema.omit({ groupId: true }).partial()
export type CreateMonitorInput = z.infer<typeof createMonitorInputSchema>
export type UpdateMonitorInput = z.infer<typeof updateMonitorInputSchema>

/** 动作：怎么发（即时 / 汇总），发到哪个渠道 */
export const actionSchema = z.object({
  ...commonRead,
  groupId: idSchema,
  name: z.string().min(1).max(60),
  triggerType: actionTriggerSchema,
  channelId: idSchema,
  /** 仅汇总动作需要 */
  cronExpression: z.string().max(120).nullable(),
  /** 选中的消息模板 id；null = 用跟随界面语言的系统内置模板 */
  templateId: z.string().max(120).nullable(),
  /** 汇总动作是否包含已即时推送过的内容 */
  includeDelivered: z.boolean(),
  /** 一次发送里多条命中合并成一条消息（关掉就是一条一条发） */
  mergeMessages: z.boolean(),
  enabled: z.boolean(),
})
export type Action = z.infer<typeof actionSchema>

export const createActionInputSchema = z.object({
  groupId: idSchema,
  name: trimmedRequired(60),
  triggerType: actionTriggerSchema.default('instant'),
  channelId: idSchema,
  cronExpression: optionalCronSchema().default(null),
  templateId: trimmedText(120).nullable().default(null),
  includeDelivered: z.boolean().default(false),
  mergeMessages: z.boolean().default(true),
  enabled: z.boolean().default(true),
})
export const updateActionInputSchema = createActionInputSchema.omit({ groupId: true }).partial()
export type CreateActionInput = z.infer<typeof createActionInputSchema>
export type UpdateActionInput = z.infer<typeof updateActionInputSchema>

/** 渠道：往哪儿发 */
export const channelSchema = z.object({
  ...commonRead,
  name: z.string().min(1).max(60),
  type: channelTypeSchema,
  /** 非密钥类参数（webhook 地址、chat id 等）；密钥只存库不回显 */
  config: z.record(z.string(), z.string()),
  hasSecret: z.boolean(),
  enabled: z.boolean(),
  /** 只读：最近一次投递成功的时间；null＝从未推送过，不传＝还没实现这个字段 */
  lastDeliveredAt: z.string().nullable().optional(),
})
export type Channel = z.infer<typeof channelSchema>

export const createChannelInputSchema = z.object({
  name: trimmedRequired(60),
  type: channelTypeSchema,
  config: channelConfigSchema.default({}),
  secret: trimmedText(500).optional(),
  enabled: z.boolean().default(true),
})
export const updateChannelInputSchema = z.object({
  name: trimmedRequired(60).optional(),
  type: channelTypeSchema.optional(),
  config: channelConfigSchema.optional(),
  /** 传字符串 = 覆盖，传 null = 清空，不传 = 不动 */
  secret: trimmedText(500).nullable().optional(),
  enabled: z.boolean().optional(),
})
export type CreateChannelInput = z.infer<typeof createChannelInputSchema>
export type UpdateChannelInput = z.infer<typeof updateChannelInputSchema>

/** 模型供应商与模型清单 */
export const modelProviderSchema = z.object({
  ...commonRead,
  name: z.string().min(1).max(60),
  kind: providerKindSchema,
  baseUrl: z.string().min(1).max(500),
  hasApiKey: z.boolean(),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
})
export type ModelProvider = z.infer<typeof modelProviderSchema>

export const createModelProviderInputSchema = z.object({
  name: trimmedRequired(60),
  kind: providerKindSchema,
  baseUrl: httpUrl(500),
  apiKey: trimmedText(500).optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})
export const updateModelProviderInputSchema = z.object({
  name: trimmedRequired(60).optional(),
  kind: providerKindSchema.optional(),
  baseUrl: httpUrl(500).optional(),
  /** 传字符串 = 覆盖，传 null = 清空，不传 = 不动 */
  apiKey: trimmedText(500).nullable().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})
export type CreateModelProviderInput = z.infer<typeof createModelProviderInputSchema>
export type UpdateModelProviderInput = z.infer<typeof updateModelProviderInputSchema>

/** 供应商接口报回来的可用模型清单（拿不到就是空数组，界面上静默不显示） */
export const availableModelsSchema = z.object({
  models: z.array(z.string().min(1).max(200)),
})
export type AvailableModels = z.infer<typeof availableModelsSchema>
