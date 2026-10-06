import { z } from 'zod'

/** 全局设置：默认值写在这里，库里只存被改过的项（删掉改动即恢复默认） */
export const settingsSchema = z.object({
  /** RSSHub 实例地址（单实例），发现里写相对路由时用它拼 */
  rsshubBaseUrl: z.string().max(500),
  /** RSSHub 实例的访问密钥，跟实例地址一起配（有些实例带 token），可为空 */
  rsshubAccessKey: z.string().max(200),
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
  /** 中等档的高分线：分数到这条线直接放行 */
  scoreHighLine: z.number().int().min(5).max(100),
  /** 中等档的低分线：分数到这条线直接丢掉 */
  scoreLowLine: z.number().int().min(0).max(95),
  /** 宽松档的低分线（比中等档低，更容易命中） */
  looseLowLine: z.number().int().min(0).max(95),
  /** 宽松档的高分线 */
  looseHighLine: z.number().int().min(5).max(100),
  /** 严格档的低分线（比中等档高，更难过关） */
  strictLowLine: z.number().int().min(0).max(95),
  /** 严格档的高分线 */
  strictHighLine: z.number().int().min(5).max(100),
  /** 模型不通时怎么办：fallback = 降级到纯算法，error = 这次不判（等下次再判） */
  llmFallbackMode: z.enum(['fallback', 'error']),
  /** 全局排除词 */
  globalExcludeKeywords: z.array(z.string().min(1).max(100)).max(200),
  /** 每天最多投递几条，0 表示不限（默认不限） */
  dailyDeliveryLimit: z.number().int().min(0).max(1000),
  /** 单次抓取超时（秒） */
  requestTimeoutSeconds: z.number().int().min(5).max(300),
  /** 失败重试次数 */
  maxRetries: z.number().int().min(0).max(5),
  /** 一次推送最多等多久（秒）：Webhook 与 Telegram 共用 */
  deliveryTimeoutSeconds: z.number().int().min(5).max(120),
  /** 界面与默认消息模板的语言 */
  language: z.enum(['zh', 'en']),
  /** 单次模型请求超时（秒） */
  llmTimeoutSeconds: z.number().int().min(5).max(300),
  /** 模型请求级重试次数 */
  llmMaxRetries: z.number().int().min(0).max(5),
  /** 时区：system 表示跟随系统 */
  timezone: z.string().min(1).max(60),
})
export type Settings = z.infer<typeof settingsSchema>
export type SettingKey = keyof Settings

export const SETTINGS_KEYS = Object.keys(settingsSchema.shape) as SettingKey[]

export const SETTINGS_DEFAULTS: Settings = {
  // 本机 RSSHub（官方默认端口 1200）：没配过也能直接用相对路由；这个值在设置页显示成 placeholder
  rsshubBaseUrl: 'http://localhost:1200',
  rsshubAccessKey: '',
  judgeMode: 'algorithm',
  concurrency: 5,
  retentionDays: 90,
  eventArchiveDays: 14,
  freshnessWindowDays: 7,
  scoreHighLine: 65,
  scoreLowLine: 35,
  looseLowLine: 25,
  looseHighLine: 55,
  strictLowLine: 45,
  strictHighLine: 80,
  llmFallbackMode: 'fallback',
  globalExcludeKeywords: [],
  dailyDeliveryLimit: 0,
  requestTimeoutSeconds: 30,
  maxRetries: 2,
  deliveryTimeoutSeconds: 15,
  language: 'zh',
  llmTimeoutSeconds: 30,
  llmMaxRetries: 1,
  timezone: 'system',
}

export const updateSettingsInputSchema = settingsSchema.partial()
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>
