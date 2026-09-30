/**
 * Kestrel 领域模型（前端视角）。
 * 与 docs/grouped-ui-api-contract.md 中的对象定义保持一致：
 * 分组 = 一件关注事项；来源在分组级采集；一个监听 = 一个关注对象及其独立事件流。
 */

export type CardKind = 'source' | 'watcher' | 'action'
export type ConnectorKind = 'rss' | 'rsshub' | 'github' | 'telegram' | 'web'
export type ActionTrigger = 'instant' | 'digest'
export type ChannelType = 'telegram' | 'wecom' | 'weixin' | 'webhook' | 'email'
export type LlmProfileType = 'openai-compatible' | 'ollama' | 'anthropic'

export interface CronSchedule {
  /** 五段 cron 或预设名（如 @daily） */
  expression: string
}

interface CardBase {
  id: string
  kind: CardKind
  name: string
  enabled: boolean
}

export interface SourceCard extends CardBase {
  kind: 'source'
  connector: ConnectorKind
  /** 连接器相关配置：rsshub 只存实例 ID + route ID + 参数，不重复保存实例密钥 */
  config: Record<string, string | number | boolean>
  cron: CronSchedule
}

export interface WatcherCard extends CardBase {
  kind: 'watcher'
  sourceIds: string[]
  focus: string
  include: string[]
  exclude: string[]
  operator: 'any' | 'all'
  llmEnabled: boolean
  llmProfileId?: string
  fallbackEnabled: boolean
  actionIds: string[]
}

export interface ActionCard extends CardBase {
  kind: 'action'
  trigger: ActionTrigger
  channelId: string
  template: string
  cron?: CronSchedule
}

export type AnyCard = SourceCard | WatcherCard | ActionCard

export interface Group {
  id: string
  name: string
  description: string
  enabled: boolean
  revision: number
  cards: AnyCard[]
}

export interface Channel {
  id: string
  name: string
  type: ChannelType
  enabled: boolean
  capabilities: { instant: boolean; digest: boolean }
  /** 只暴露配置状态，凭据值永不出现在列表里 */
  credentialStatus: 'unset' | 'configured' | 'invalid'
}

export interface LlmProfile {
  id: string
  name: string
  type: LlmProfileType
  enabled: boolean
  credentialStatus: 'unset' | 'configured' | 'invalid'
}

export interface RsshubInstance {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  catalogStatus: 'unknown' | 'syncing' | 'ready' | 'error'
}

export interface Settings {
  timezone: string
  retryLimit: number
  requestTimeoutSeconds: number
  retentionDays: number
}

export interface Workspace {
  groups: Group[]
  channels: Channel[]
  llmProfiles: LlmProfile[]
  rsshubInstances: RsshubInstance[]
  settings: Settings
}
