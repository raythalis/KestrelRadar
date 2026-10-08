import type {
  DismissIncidentResult,
  EventListQuery,
  EventPage,
  EventReadResult,
  EventSourceOption,
  Incident,
  StatsOverview,
} from '@kestrel/contracts'

import { http } from '@/api/http'

/** GET /api/stats/overview —— 仪表盘八张卡 + RSSHub 状态，一次拿齐 */
export async function fetchStatsOverview(): Promise<StatsOverview> {
  const { data } = await http.get<StatsOverview>('/stats/overview')
  return data
}

/** GET /api/events —— 最近事件：24 小时窗口、按最近一次发生时间倒序，一页一页给 */
export async function fetchRecentEvents(query: EventListQuery = {}): Promise<EventPage> {
  const { data } = await http.get<EventPage>('/events', { params: query })
  return data
}

/** GET /api/events/sources —— 筛选浮层的来源清单：窗口内每个来源有几个事件 */
export async function fetchEventSources(): Promise<EventSourceOption[]> {
  const { data } = await http.get<EventSourceOption[]>('/events/sources')
  return data
}

/** POST /api/events/:id/read —— 点开一条就记已读（重复点不改第一次的时间） */
export async function markEventRead(id: string): Promise<EventReadResult> {
  const { data } = await http.post<EventReadResult>(`/events/${id}/read`)
  return data
}

/** GET /api/incidents —— 库里最近 n 条里没被忽视的异常 */
export async function fetchIncidents(): Promise<{ incidents: Incident[]; limit: number }> {
  const { data } = await http.get<{ incidents: Incident[]; limit: number }>('/incidents')
  return data
}

/** POST /api/incidents/:id/dismiss —— 忽视一条：只改状态，不删记录 */
export async function dismissIncident(id: string): Promise<DismissIncidentResult> {
  const { data } = await http.post<DismissIncidentResult>(`/incidents/${id}/dismiss`)
  return data
}
