import type { Incident } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import { nowIso } from '../../db/sql.ts'
import type { IncidentRepo, NewIncident } from './incident.repo.ts'

export interface IncidentLimits {
  /** 库里与前端同为多少条 */
  limit: number
  /** 同一条错误的去重窗口（分钟） */
  dedupMinutes: number
}

export interface IncidentServiceDeps {
  repo: IncidentRepo
  limits: () => IncidentLimits
}

/**
 * 异常：一轮运行里的一个错误记一条。
 * 写入时的两条防噪规矩：同一条错误在窗口内重复只更新时间；库里只留最近 limit 条。
 */
export function createIncidentService(deps: IncidentServiceDeps) {
  return {
    /**
     * 记一条异常。同一个对象、同一个错误码在去重窗口内重复发生时，不新增记录，
     * 只把那条记录的时间与文案更新成最近一次（首次时间保持不变）。
     */
    record(input: NewIncident): Incident {
      const at = nowIso()
      const { limit, dedupMinutes } = deps.limits()
      if (dedupMinutes > 0) {
        const since = new Date(Date.now() - dedupMinutes * 60 * 1000).toISOString()
        const repeat = deps.repo.findRepeat(input.kind, input.targetId, input.code, since)
        if (repeat) {
          return deps.repo.touch(repeat.id, input.message, input.detail ?? null, at)
        }
      }
      const created = deps.repo.create(input, at)
      deps.repo.prune(limit)
      return created
    },

    /** 前端展示：最近 limit 条里没被忽视的那些 */
    list(): { incidents: Incident[]; limit: number } {
      const { limit } = deps.limits()
      return { incidents: deps.repo.listOpen(limit), limit }
    },

    /** 库里实际留下的（含已忽视），排查与测试用 */
    listAll(): Incident[] {
      return deps.repo.listRecent(deps.limits().limit)
    },

    /** 忽视：只改状态，不删记录；前端拿到之后把那一行去掉 */
    dismiss(id: string): Incident {
      const existing = deps.repo.get(id)
      if (!existing) throw AppError.notFound('没有这条异常')
      if (existing.status !== 'dismissed') deps.repo.dismiss(id, nowIso())
      const updated = deps.repo.get(id)
      if (!updated) throw AppError.notFound('没有这条异常')
      return updated
    },
  }
}

export type IncidentService = ReturnType<typeof createIncidentService>
