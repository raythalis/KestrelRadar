import { failureCopy, type StatsRsshub } from '@kestrel/contracts'

import type { SettingsService } from '../settings/settings.service.ts'

export interface RsshubStatusDeps {
  settings: SettingsService
  fetchImpl?: typeof fetch
  /** 结果在内存里缓多久（毫秒）；默认 20 秒，探测不写日志、不落库 */
  cacheMs?: number
  timeoutMs?: number
}

const DEFAULT_CACHE_MS = 20_000
const DEFAULT_TIMEOUT_MS = 5_000

/**
 * RSSHub 状态：仪表盘那张卡用的。
 * 同一个实例地址 20 秒内只真探一次；地址一变缓存立刻作废。
 */
export function createRsshubStatus(deps: RsshubStatusDeps) {
  const doFetch = deps.fetchImpl ?? fetch
  const cacheMs = deps.cacheMs ?? DEFAULT_CACHE_MS
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let cache: { baseUrl: string; at: number; status: StatsRsshub } | null = null

  /** probe(force, baseUrl)：baseUrl 传了就探这一串（设置页测没保存的地址），不传用库里存的 */
  async function probe(force = false, baseUrlOverride?: string): Promise<StatsRsshub> {
    const baseUrl = (baseUrlOverride ?? deps.settings.get().rsshubBaseUrl).replace(/\/+$/, '')
    if (!baseUrl) {
      return {
        configured: false,
        ok: false,
        baseUrl: '',
        message: failureCopy('rsshub.baseMissing'),
        checkedAt: null,
      }
    }
    if (!force && cache && cache.baseUrl === baseUrl && Date.now() - cache.at < cacheMs) {
      return cache.status
    }

    let status: StatsRsshub
    try {
      const response = await doFetch(baseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'text/html,*/*' },
      })
      status = {
        configured: true,
        ok: response.ok,
        baseUrl,
        message: response.ok ? '实例连通' : `实例返回 ${response.status}`,
        checkedAt: new Date().toISOString(),
      }
    } catch {
      status = {
        configured: true,
        ok: false,
        baseUrl,
        message: failureCopy('fetch.network'),
        checkedAt: new Date().toISOString(),
      }
    }

    cache = { baseUrl, at: Date.now(), status }
    return status
  }

  return { probe }
}

export type RsshubStatus = ReturnType<typeof createRsshubStatus>
