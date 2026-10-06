import type { ChannelType, DiscoveryKind, MonitorMode } from '@kestrel/contracts'

/**
 * 图标语义表：**一个字形只表示一个意思**。
 *
 * 同一种语义在多个地方用同一个字形是对的（比如「监听」在指标卡和列头都用同一个）；
 * 但两个不同语义绝不允许共用字形 —— 之前就撞过：订阅源的信号图标同时表示
 * 「RSS 来源类型」和「发现」，纸飞机同时表示 Telegram 渠道、动作和今日已投递。
 *
 * `__tests__/icons.spec.ts` 会扫下面这几张表，同一个字形挂在两个语义上就报红。
 * 名字必须在这套裁剪图标字体里（`styles/mdi.scss`；加字形要重跑生成命令，另有单测兜底）。
 * 注意：@mdi/font 7 起删掉了一批品牌图标（telegram / wechat 都没有），名字写错只会渲染成空白。
 */

/** 渠道类型 → 图标 */
export const CHANNEL_ICONS: Record<ChannelType, string> = {
  telegram: 'mdi-send',
  webhook: 'mdi-webhook',
}

/** 发现来源类型 → 图标（抓不到网站图标时的回落） */
export const DISCOVERY_ICONS: Record<DiscoveryKind, string> = {
  rss: 'mdi-rss',
  rsshub: 'mdi-cube-outline',
  web: 'mdi-web',
}

/** 监听模式 → 图标 */
export const MONITOR_ICONS: Record<MonitorMode, string> = {
  follow_global: 'mdi-cog-outline',
  algorithm: 'mdi-tune-variant',
  algorithm_llm: 'mdi-robot-outline',
}

/** 界面语义 → 图标（卡片头、指标卡、列头这些位置用） */
export const SEMANTIC_ICONS = {
  /** 发现（统计项 / 列头） */
  discovery: 'mdi-inbox-outline',
  /** 监听（统计项 / 列头） */
  monitor: 'mdi-filter-variant',
  /** 动作（统计项 / 列头） */
  action: 'mdi-bell-ring-outline',
  /** 通知渠道（统计项） */
  channel: 'mdi-broadcast',
  /** 今日新事件 */
  event: 'mdi-star',
  /** 今日已投递 */
  delivered: 'mdi-check-circle',
  /** 采集成功率 */
  collection: 'mdi-tray-arrow-down',
  /** RSSHub 状态（自建实例的连通性） */
  rsshub: 'mdi-server-network',
  /** 翻卡：看背面的数据 */
  flip: 'mdi-poll',
  /** 异常记录（采集/判定/推送出错） */
  incident: 'mdi-alert-circle',
  /** 试抓：手动跑一次采集 */
  testFetch: 'mdi-cached',
} as const
