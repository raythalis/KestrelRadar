/**
 * 仪表盘的「最近事件」读模型：列表、全部事件、来源筛选都走这一套。
 *
 * 事件本体由 api 侧的归并模块维护（events 表 + event_items），这里只挑界面要看的字段：
 * 标题、原文链接、分组名、来源、时间、已读状态。
 */

import type { DiscoveryKind } from './enums.ts'

/** 时间窗口（小时）：最近事件与全部事件都只看这一天内还有动静的事 */
export const EVENT_WINDOW_HOURS = 24

/** 一页几条（全部事件是滚动加载，每次要这么多） */
export const EVENT_PAGE_SIZE = 20

/** 一页最多几条，挡住调用方一次拉爆 */
export const EVENT_PAGE_SIZE_MAX = 50

/** 行内最多挂几个来源标签，多出来的用 +N 表示 */
export const EVENT_SOURCE_TAG_LIMIT = 2

/**
 * 事件的一个来源：点标签直接开这家的原文。
 * url 取这家最早那条条目的链接；这条条目没有链接就是 null，标签仍然显示、只是点不动。
 */
export interface EventSourceRef {
  discoveryId: string
  name: string
  url: string | null
}

export interface RecentEvent {
  id: string
  title: string
  /** 默认打开的原文：第一个来源最早那条条目的链接；没有就是 null，界面上不给可点的入口 */
  url: string | null
  groupId: string
  /** 分组当前的名字（分组改名或删掉时退化成空串，界面不显示这一段） */
  groupName: string
  /** 最先提到这件事的来源类型（界面据此取类型图标） */
  kind: DiscoveryKind
  /**
   * 提到这件事的全部来源，按最早提到这件事的先后排。
   * 界面只把前 EVENT_SOURCE_TAG_LIMIT 个挂成标签，多出来的收进 +N 浮层（所以这里不截断）。
   */
  sources: EventSourceRef[]
  /** 一共几个来源提到（可能多于 sources 的条数，多出来的用 +N 表示） */
  sourceCount: number
  /**
   * 提到这件事的来源名，最多 EVENT_SOURCE_NAME_LIMIT 个。
   * @deprecated 阶段 3 迁移到 sources 之后删掉，现在只有旧的文字标签在用。
   */
  sourceNames: string[]
  /** 事件里并了几个条目 */
  itemCount: number
  /** 第一次发生的时间 */
  firstItemAt: string
  /** 最近一次发生的时间（列表按它倒序） */
  lastItemAt: string
  /** 看过的时间；没看过就是 null（界面挂实心圆点） */
  readAt: string | null
}

/** 列表一页：events 是本页内容，nextCursor 为空表示到底了 */
export interface EventPage {
  events: RecentEvent[]
  nextCursor: string | null
  /** 窗口内一共有多少条（跟着来源筛选走）；徽章上的数字用它，不受分页影响 */
  total: number
}

/** 来源筛选弹层的一项：窗口内这个来源有几个事件 */
export interface EventSourceOption {
  discoveryId: string
  name: string
  count: number
}

/** 列表查询参数：cursor 不传就是第一页 */
export interface EventListQuery {
  cursor?: string
  limit?: number
  /** 只看这个来源提到的事件；不传就是全部来源 */
  discoveryId?: string
}

/** 标已读的结果 */
export interface EventReadResult {
  id: string
  readAt: string
}

/** 旧的来源名上限，配合已废弃的 sourceNames 使用 */
export const EVENT_SOURCE_NAME_LIMIT = 3
