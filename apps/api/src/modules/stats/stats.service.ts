import type { CardStat, CardStats, StatsCount, StatsOverview } from '@kestrel/contracts'

import { dayWindows, startOfDayIso } from '../../utils/day.ts'
import type { ActionRepo } from '../actions/action.repo.ts'
import type { ChannelRepo } from '../channels/channel.repo.ts'
import type { RunRepo } from '../collection/run.repo.ts'
import type { RsshubStatus } from '../config/rsshub-status.ts'
import type { DeliveryRepo } from '../delivery/delivery.repo.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { EventRepo } from '../events/event.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { MonitorRepo } from '../monitors/monitor.repo.ts'
import type { JudgmentRepo } from '../judgment/judgment.repo.ts'
import type { HiddenSettings } from '../settings/hidden.ts'
import type { SettingsService } from '../settings/settings.service.ts'

export interface StatsDeps {
  groups: GroupRepo
  discoveries: DiscoveryRepo
  monitors: MonitorRepo
  actions: ActionRepo
  channels: ChannelRepo
  events: EventRepo
  deliveries: DeliveryRepo
  judgments: JudgmentRepo
  runs: RunRepo
  settings: SettingsService
  hidden: HiddenSettings
  rsshub: RsshubStatus
}

function count(rows: { enabled: boolean }[]): StatsCount {
  return { enabled: rows.filter((row) => row.enabled).length, total: rows.length }
}

function rate(ok: number, total: number): number | null {
  if (total === 0) return null
  return Math.round((ok / total) * 1000) / 1000
}

/** 仪表盘汇总：全是只读计算，不落库 */
export function createStatsService(deps: StatsDeps) {
  return {
    async overview(): Promise<StatsOverview> {
      const timezone = deps.settings.get().timezone
      const windowDays = deps.hidden.statsWindowDays()
      const windowStart = startOfDayIso(timezone, windowDays - 1)
      const todayStart = startOfDayIso(timezone, 0)
      const yesterdayStart = startOfDayIso(timezone, 1)

      const collection = deps.runs.summarySince(windowStart)
      const sent = deps.deliveries.countByStatusSince('sent', todayStart)
      const failed = deps.deliveries.countByStatusSince('failed', todayStart)

      return {
        counts: {
          discoveries: count(deps.discoveries.list()),
          monitors: count(deps.monitors.list()),
          actions: count(deps.actions.list()),
          channels: count(deps.channels.list()),
        },
        events: {
          today: deps.events.countCreatedSince(todayStart),
          yesterday:
            deps.events.countCreatedSince(yesterdayStart) -
            deps.events.countCreatedSince(todayStart),
        },
        delivery: { sent, failed, rate: rate(sent, sent + failed) },
        collection: {
          windowDays,
          rounds: collection.rounds,
          okRounds: collection.routeOk,
          rate: rate(collection.routeOk, collection.rounds),
          failingSources: collection.failingSources,
        },
        rsshub: await deps.rsshub.probe(),
      }
    },

    /**
     * 卡片背面的按对象汇总：一次拿齐发现 / 监听 / 动作三张（全只读计算，不落库）。
     * 口径与用户确认的一致——成功率按「路由成功」，筛选率是命中占比，计数分别是抓到条数 / 命中条数 / 投递次数。
     */
    async cardStats(): Promise<CardStats> {
      const timezone = deps.settings.get().timezone
      const windowDays = deps.hidden.statsWindowDays()
      const windows = dayWindows(timezone, windowDays)

      const discoveries: Record<string, CardStat> = {}
      for (const row of deps.runs.discoveryStatsSince(windows)) {
        discoveries[row.discoveryId] = {
          rate: rate(row.okRounds, row.rounds),
          total: row.found,
          daily: row.daily,
        }
      }

      const monitors: Record<string, CardStat> = {}
      for (const row of deps.judgments.monitorStatsSince(windows)) {
        monitors[row.monitorId] = {
          rate: rate(row.passed, row.judged),
          total: row.passed,
          daily: row.daily,
        }
      }

      const actions: Record<string, CardStat> = {}
      for (const row of deps.deliveries.actionStatsSince(windows)) {
        actions[row.actionId] = {
          rate: rate(row.sent, row.deliveries),
          total: row.deliveries,
          daily: row.daily,
        }
      }

      return { windowDays, discoveries, monitors, actions }
    },
  }
}

export type StatsService = ReturnType<typeof createStatsService>
