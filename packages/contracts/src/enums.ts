import { z } from 'zod'

export const DISCOVERY_KINDS = ['rsshub', 'rss', 'web'] as const
export const MONITOR_MODES = ['follow_global', 'algorithm', 'algorithm_llm'] as const
export const SENSITIVITIES = ['low', 'medium', 'high'] as const
export const MATCH_MODES = ['any', 'all'] as const
export const JUDGE_DECISIONS = ['pass', 'drop'] as const
export const JUDGE_BANDS = ['high', 'gray', 'low'] as const
/** 结论定在哪一层：关键词门槛 / 排除词 / 打分 / 模型复核 */
export const JUDGE_LAYERS = ['keywords', 'excludes', 'score', 'llm'] as const
export const ACTION_TRIGGERS = ['instant', 'digest'] as const
export const CHANNEL_TYPES = ['telegram', 'webhook'] as const
export const PROVIDER_KINDS = ['openai_compatible', 'ollama'] as const

export const discoveryKindSchema = z.enum(DISCOVERY_KINDS)
export const monitorModeSchema = z.enum(MONITOR_MODES)
export const sensitivitySchema = z.enum(SENSITIVITIES)
export const matchModeSchema = z.enum(MATCH_MODES)
export const judgmentDecisionSchema = z.enum(JUDGE_DECISIONS)
export const judgmentBandSchema = z.enum(JUDGE_BANDS)
export const judgmentLayerSchema = z.enum(JUDGE_LAYERS)
export const actionTriggerSchema = z.enum(ACTION_TRIGGERS)
export const channelTypeSchema = z.enum(CHANNEL_TYPES)
export const providerKindSchema = z.enum(PROVIDER_KINDS)

export type DiscoveryKind = z.infer<typeof discoveryKindSchema>
export type MonitorMode = z.infer<typeof monitorModeSchema>
export type Sensitivity = z.infer<typeof sensitivitySchema>
export type MatchMode = z.infer<typeof matchModeSchema>
export type ActionTrigger = z.infer<typeof actionTriggerSchema>
export type ChannelType = z.infer<typeof channelTypeSchema>
export type ProviderKind = z.infer<typeof providerKindSchema>
