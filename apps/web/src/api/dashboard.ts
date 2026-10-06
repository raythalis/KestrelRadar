import type {
  DismissIncidentResult,
  Incident,
  RecentEvent,
  StatsOverview,
} from '@kestrel/contracts'

import { http } from '@/api/http'

/** GET /api/stats/overview —— 仪表盘八张卡 + RSSHub 状态，一次拿齐 */
export async function fetchStatsOverview(): Promise<StatsOverview> {
  const { data } = await http.get<StatsOverview>('/stats/overview')
  return data
}

/** GET /api/events —— 最近事件（条数由后端定，按最近一次发生时间倒序） */
export async function fetchRecentEvents(): Promise<RecentEvent[]> {
  const { data } = await http.get<RecentEvent[]>('/events')
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
