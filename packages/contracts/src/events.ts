/**
 * 仪表盘的「最近事件列表」：只读读模型。
 *
 * 事件本体由 api 侧的归并模块维护（events 表 + event_items），这里只挑界面要看的字段：
 * 标题、原文链接、分组名、来源名、时间。分数与分档配色已作废，不在这里出现。
 */

import type { DiscoveryKind } from './enums.ts'

/** 最近事件列表的条数（需求：最近 20 条，按时间倒序） */
export const EVENT_LIST_LIMIT = 20

/** 来源名最多给几个（多出来的用 sourceCount 表示「等 n 个来源」） */
export const EVENT_SOURCE_NAME_LIMIT = 3

export interface RecentEvent {
  id: string
  title: string
  /** 事件里第一个条目的原文链接；没有就是 null，界面上不给可点的入口 */
  url: string | null
  groupId: string
  /** 分组当前的名字（分组改名或删掉时退化成空串，界面不显示这一段） */
  groupName: string
  /** 最先提到这件事的来源类型（界面据此取类型图标） */
  kind: DiscoveryKind
  /** 提到这件事的来源名（按发现去重，最多 EVENT_SOURCE_NAME_LIMIT 个） */
  sourceNames: string[]
  /** 一共几个来源提到（可能多于 sourceNames 的条数） */
  sourceCount: number
  /** 事件里并了几个条目 */
  itemCount: number
  /** 第一次发生的时间 */
  firstItemAt: string
  /** 最近一次发生的时间（列表按它倒序） */
  lastItemAt: string
}
