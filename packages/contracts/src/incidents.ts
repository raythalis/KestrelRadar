/**
 * 异常与采集轮次：异常 = 某一轮运行里的一个错误，按日志记一条。
 *
 * 口径（2026-10-03 定）：
 * - 一轮失败 → 一条异常；库里留最近 n 条，前端就展示这 n 条（同一个隐藏配置项）；
 * - 用户忽视只改状态，库里保留、前端不再展示，不提供删除；
 * - 同一对象同一种错误在去重窗口内重复发生，只更新那一条（首次时间不变）。
 */

export const INCIDENT_KINDS = ['collection', 'judgment', 'delivery'] as const
export type IncidentKind = (typeof INCIDENT_KINDS)[number]

export type IncidentStatus = 'open' | 'dismissed'

export interface Incident {
  id: string
  /** 哪一类失败：采集 / 模型 / 推送 */
  kind: IncidentKind
  /** 出错的对象 id：发现 / 监听 / 动作 */
  targetId: string
  /** 对象名字快照（对象删了也看得懂） */
  targetName: string
  /** 分组 id 与名字快照 */
  groupId: string | null
  groupName: string
  /** 错误码，用来分类与统计 */
  code: string
  /** 错误文案，直接展示 */
  message: string
  /** 原始错误，排查时才看 */
  detail: string | null
  status: IncidentStatus
  dismissedAt: string | null
  /** 第一次发生的时间 */
  firstSeenAt: string
  /** 最近一次发生的时间 */
  createdAt: string
}

/** 一次采集运行的流水，只服务统计（成功率、失败源数），界面上不直接展示 */
export interface CollectionRun {
  id: string
  discoveryId: string
  /** 请求到了内容（含「成功但没条目」） */
  routeOk: boolean
  /** 内容可用（解析出了条目） */
  contentOk: boolean
  /** 这一轮抓回多少条（含重复） */
  foundCount: number
  /** 真正新增多少条 */
  newCount: number
  durationMs: number
  code: string | null
  message: string
  createdAt: string
}

/**
 * 隐藏配置项：固化在代码里，界面上不出现。
 * 想暴露成可见设置时，把它们挪进 settingsSchema 即可。
 */
export const HIDDEN_LIMITS = {
  /** 异常：库里与前端同为多少条 */
  incidentLimit: 20,
  /** 同一条错误的去重窗口（分钟） */
  incidentDedupMinutes: 60,
  /** 统计窗口（天） */
  statsWindowDays: 7,
  /** 采集流水保留天数 */
  runRetentionDays: 30,
} as const

/** 隐藏配置项在 settings 表里的键名（带前缀，避免和可见设置撞名） */
export const HIDDEN_KEYS = {
  incidentLimit: 'hidden.incidentLimit',
  incidentDedupMinutes: 'hidden.incidentDedupMinutes',
  statsWindowDays: 'hidden.statsWindowDays',
  runRetentionDays: 'hidden.runRetentionDays',
} as const

export interface DismissIncidentResult {
  id: string
  status: IncidentStatus
}
