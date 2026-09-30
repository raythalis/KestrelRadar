import type { ConfigSnapshot } from '@kestrel/contracts'

import { http } from '@/api/http'

/** GET /api/config —— 分组 / 发现 / 监听 / 动作 / 渠道 / 模型 / 设置的只读快照 */
export async function fetchConfig(): Promise<ConfigSnapshot> {
  const { data } = await http.get<ConfigSnapshot>('/config')
  return data
}
