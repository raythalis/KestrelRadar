import { http } from '@/api/http'
import type { Workspace } from '@/types/domain'

/** GET /api/v2/workspace —— 分组 / 渠道 / 模型 / 实例 / 设置的只读快照 */
export async function fetchWorkspace(): Promise<Workspace> {
  const { data } = await http.get<Workspace>('/workspace')
  return data
}
