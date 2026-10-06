import { z } from 'zod'

import { textList, trimmedText } from './validation.ts'

import {
  judgmentBandSchema,
  judgmentDecisionSchema,
  judgmentLayerSchema,
  matchModeSchema,
  monitorModeSchema,
  sensitivitySchema,
} from './enums.ts'

/** 判定结果：一条内容 × 一条监听 = 一条记录，理由留着给人看 */
export const judgmentSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  monitorId: z.string().min(1),
  decision: judgmentDecisionSchema,
  band: judgmentBandSchema,
  score: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  /** 结论是在哪一层定下来的：关键词门槛 / 排除词 / 打分 / 模型复核 */
  layer: judgmentLayerSchema,
  reasons: z.array(z.string()),
  /** 模型复核给的一句话，没走模型就是 null */
  llmReason: z.string().nullable(),
  createdAt: z.string(),
})
export type Judgment = z.infer<typeof judgmentSchema>

/** 规则预览的临时规则：跟监听卡片上的字段一一对应，不传就用卡片上保存的 */
export const previewRulesSchema = z.object({
  mode: monitorModeSchema.optional(),
  sensitivity: sensitivitySchema.optional(),
  matchMode: matchModeSchema.optional(),
  intentText: trimmedText(500).optional(),
  includeKeywords: textList(100, 200).optional(),
  excludeKeywords: textList(100, 200).optional(),
  useGlobalExcludes: z.boolean().optional(),
})

export const previewRequestSchema = z.object({
  /** 拿最近多少条内容试跑 */
  sampleSize: z.number().int().min(1).max(50).default(10),
  rules: previewRulesSchema.optional(),
})
/** 调用方可能不填 sampleSize（服务里有默认值），所以服务层用这个宽松类型 */
export type PreviewRequestInput = z.input<typeof previewRequestSchema>

export const previewSampleSchema = z.object({
  itemId: z.string().min(1),
  title: z.string(),
  url: z.string().nullable(),
  discoveryId: z.string().min(1),
  decision: judgmentDecisionSchema,
  band: judgmentBandSchema,
  score: z.number().int(),
  matchedKeywords: z.array(z.string()),
  reasons: z.array(z.string()),
})
export type PreviewSample = z.infer<typeof previewSampleSchema>

export const previewResultSchema = z.object({
  total: z.number().int(),
  matched: z.number().int(),
  dropped: z.number().int(),
  /** 这批内容里有没有会走到模型的（界面用来提示成本） */
  needsModel: z.boolean(),
  /** 只给几条例子，够判断规则松紧就行 */
  samples: z.array(previewSampleSchema),
})
export type PreviewResult = z.infer<typeof previewResultSchema>
