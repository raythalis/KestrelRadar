import type { CardStats } from '@kestrel/contracts'

import { http } from '@/api/http'

/** GET /api/stats/cards —— 三列卡片背面的按对象汇总（与仪表盘同窗口，只读） */
export async function fetchCardStats(): Promise<CardStats> {
  const { data } = await http.get<CardStats>('/stats/cards')
  return data
}
