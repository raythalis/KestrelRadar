// 业务组件层共用的类型。
// 单独放一个文件是因为 <script setup> 里不允许 export 语句。

/** 渠道弹窗交出去的值（页面负责拼成 create/update 入参） */
export interface ChannelDialogValues {
  name: string
  type: 'telegram' | 'webhook' | 'wecom' | 'dingtalk' | 'feishu' | 'email'
  enabled: boolean
  /** Telegram 用 */
  chatId: string
  /** Webhook 用 */
  url: string
  sign?: boolean
  host?: string
  port?: string
  secure?: boolean
  from?: string
  to?: string
  username?: string
  /** 密钥输入框的当前值；空字符串＝不改动已保存的密钥 */
  secret: string
}

/** 供应商弹窗交出去的值（页面负责拼成 create/update 入参） */
export interface ProviderDialogValues {
  name: string
  kind: 'openai_compatible' | 'ollama'
  baseUrl: string
  /** 密钥输入框的当前值；空字符串＝不改动已保存的密钥 */
  apiKey: string
}

/** 「读取会话」读回来的会话 */
export interface ChannelChat {
  id: string
  title: string
}

/** 数据源弹窗交出去的值（页面负责拼成 create/update 入参） */
export interface SourceDialogValues {
  name: string
  kind: 'rsshub' | 'rss' | 'web'
  /** RSSHub 路由、RSS 地址或网页地址 */
  target: string
  cronExpression: string
  enabled: boolean
}

/** 动作的触发方式：发现即发 / 每天汇总 */
export type ActionTrigger = 'instant' | 'digest'

/** 动作弹窗交出去的值（页面负责拼成 create/update 入参） */
export interface ActionDialogValues {
  name: string
  triggerType: ActionTrigger
  /** 汇总动作的发送时间；发现即发为 null */
  cron: string | null
  channelId: string
  /** null＝系统内置（默认模板） */
  templateId: string | null
  mergeMessages: boolean
  includeDelivered: boolean
  enabled: boolean
}

/** 监听弹窗交出去的值（页面负责拼成 create/update 入参） */
export interface MonitorDialogValues {
  name: string
  mode: 'follow_global' | 'algorithm' | 'algorithm_llm'
  /** 语义化意图描述，只在「算法 + LLM」模式下用得上 */
  intentText: string
  includeKeywords: string[]
  excludeKeywords: string[]
  useGlobalExcludes: boolean
  matchMode: 'any' | 'all'
  sensitivity: 'low' | 'medium' | 'high'
  enabled: boolean
  /** 非空＝指定关联动作，空＝跟随分组 */
  actionIds: string[]
}
