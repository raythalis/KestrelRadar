import { z } from 'zod'

/** 全局设置：默认值写在这里，库里只存被改过的项（删掉改动即恢复默认） */
export const settingsSchema = z.object({
  /** 全局判断模式：纯算法 或 算法 + LLM */
  judgeMode: z.enum(['algorithm', 'algorithm_llm']),
  /** 同时抓几个源 */
  concurrency: z.number().int().min(1).max(20),
  /** 条目 / 事件保留天数 */
  retentionDays: z.number().int().min(7).max(3650),
  /** 事件多久没有新条目就归档 */
  eventArchiveDays: z.number().int().min(1).max(365),
  /** 新鲜窗口天数，0 表示关闭 */
  freshnessWindowDays: z.number().int().min(0).max(365),
  /** 全局排除词 */
  globalExcludeKeywords: z.array(z.string().min(1).max(100)).max(200),
  /** 每天最多投递几条，0 表示不限（默认不限） */
  dailyDeliveryLimit: z.number().int().min(0).max(1000),
  /** 单次抓取超时（秒） */
  requestTimeoutSeconds: z.number().int().min(5).max(300),
  /** 失败重试次数 */
  maxRetries: z.number().int().min(0).max(5),
  /** 时区：system 表示跟随系统 */
  timezone: z.string().min(1).max(60),
})
export type Settings = z.infer<typeof settingsSchema>
export type SettingKey = keyof Settings

export const SETTINGS_KEYS = Object.keys(settingsSchema.shape) as SettingKey[]

export const SETTINGS_DEFAULTS: Settings = {
  judgeMode: 'algorithm',
  concurrency: 5,
  retentionDays: 90,
  eventArchiveDays: 14,
  freshnessWindowDays: 7,
  globalExcludeKeywords: [],
  dailyDeliveryLimit: 0,
  requestTimeoutSeconds: 30,
  maxRetries: 2,
  timezone: 'system',
}

export const updateSettingsInputSchema = settingsSchema.partial()
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>
