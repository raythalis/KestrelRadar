import { failureCopy } from '@kestrel/contracts'
import { Cron } from 'croner'

import type { CollectOutcome, Collector } from './collector.ts'

/**
 * 调度照 MoviePilot 的形态来：每个启用的目标注册成一个 cron 任务，由调度器自己
 * 持有「下次触发时间」并到点回调；不再靠「每分钟算一遍谁到期」那种轮询。
 * 目标有两类：发现（到点采集）与汇总动作（到点投递）。
 */

/**
 * 时区解析：'system' 与空值都表示跟随进程时区（容器里就是 compose 给的 TZ）。
 * 名字写坏了也回落 —— 否则整批任务会因为一个坏时区算不出时间而被静默停掉。
 */
export function resolveTimezone(timezone?: string): string | undefined {
  if (!timezone || timezone === 'system') return undefined
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return timezone
  } catch {
    return undefined
  }
}

function timezoneOption(timezone?: string): { timezone?: string } {
  const resolved = resolveTimezone(timezone)
  return resolved ? { timezone: resolved } : {}
}

/** 算下一次该跑的时间；cron 不合法返回 null */
export function nextRunAt(cronExpression: string, from: Date, timezone?: string): Date | null {
  try {
    const job = new Cron(cronExpression, { paused: true, ...timezoneOption(timezone) })
    const next = job.nextRun(from)
    job.stop()
    return next
  } catch {
    return null
  }
}

export function isValidCron(cronExpression: string, timezone?: string): boolean {
  return nextRunAt(cronExpression, new Date(), timezone) !== null
}

export interface ScheduleTarget {
  id: string
  cronExpression: string
  /** 自身启用 且 所在分组启用 */
  enabled: boolean
}

export interface SchedulerDeps {
  collector: Collector
  targets: () => ScheduleTarget[]
  /** 汇总动作的定时任务：跟采集共用同一套有限并发 */
  digestTargets?: () => ScheduleTarget[]
  onDigest?: (actionId: string) => Promise<void> | void
  /** 全局并发上限，运行时读设置 */
  concurrency: () => number
  /** 定时任务按哪个时区算：设置里的 timezone，'system' 跟随进程时区 */
  timezone?: () => string
  onResult?: (outcome: CollectOutcome) => void
}

interface PlannedJob {
  key: string
  id: string
  pattern: string
  digest: boolean
}

interface JobEntry {
  job: Cron
  pattern: string
  /** 建这个任务时用的时区：跟当前设置不一致就重排 */
  timezone?: string
}

const DIGEST_PREFIX = 'digest:'

export function createScheduler(deps: SchedulerDeps) {
  const jobs = new Map<string, JobEntry>()
  const nextRuns = new Map<string, string | null>()
  let active = 0
  const waiting: Array<() => void> = []
  const inFlight = new Set<Promise<void>>()

  function track(task: Promise<void>): void {
    inFlight.add(task)
    void task.finally(() => inFlight.delete(task))
  }

  /** 有限并发：同时在跑的任务不超过设置里的上限 */
  async function withSlot<T>(work: () => Promise<T>): Promise<T> {
    if (active >= Math.max(1, deps.concurrency())) {
      await new Promise<void>((resolve) => waiting.push(resolve))
    }
    active += 1
    try {
      return await work()
    } finally {
      active -= 1
      waiting.shift()?.()
    }
  }

  function refreshNextRun(key: string): void {
    nextRuns.set(key, jobs.get(key)?.job.nextRun()?.toISOString() ?? null)
  }

  async function runCollect(key: string, discoveryId: string): Promise<void> {
    const startedAt = Date.now()
    try {
      const outcome = await withSlot(() => deps.collector.collectDiscovery(discoveryId))
      deps.onResult?.({ ...outcome, durationMs: Date.now() - startedAt })
    } catch (error) {
      // 单个源炸了不能拖死调度器，也不能影响别的源
      deps.onResult?.({
        discoveryId,
        ok: false,
        routeOk: false,
        contentOk: false,
        foundCount: 0,
        newItemCount: 0,
        code: 'collection.failed',
        message: (error as Error).message || failureCopy('collection.failed'),
        durationMs: Date.now() - startedAt,
      })
    } finally {
      refreshNextRun(key)
    }
  }

  async function runDigest(key: string, actionId: string): Promise<void> {
    try {
      await withSlot(async () => {
        await deps.onDigest?.(actionId)
      })
    } catch (error) {
      deps.onResult?.({
        discoveryId: actionId,
        ok: false,
        routeOk: false,
        contentOk: false,
        foundCount: 0,
        newItemCount: 0,
        code: 'delivery.failed',
        message: (error as Error).message || '汇总投递失败',
      })
    } finally {
      refreshNextRun(key)
    }
  }

  function plan(): PlannedJob[] {
    const planned: PlannedJob[] = deps
      .targets()
      .filter((target) => target.enabled)
      .map((target) => ({
        key: target.id,
        id: target.id,
        pattern: target.cronExpression,
        digest: false,
      }))
    for (const target of deps.digestTargets?.() ?? []) {
      if (!target.enabled) continue
      planned.push({
        key: `${DIGEST_PREFIX}${target.id}`,
        id: target.id,
        pattern: target.cronExpression,
        digest: true,
      })
    }
    return planned
  }

  /** 让任务表跟目标表对齐：该建的建、频率或时区变了的换、停用或删掉的撤 */
  function sync(): void {
    const timezone = resolveTimezone(deps.timezone?.())
    const wanted = new Map<string, PlannedJob>()
    for (const job of plan()) {
      if (isValidCron(job.pattern, timezone)) wanted.set(job.key, job)
    }

    for (const [key, entry] of jobs) {
      const next = wanted.get(key)
      if (next?.pattern === entry.pattern && entry.timezone === timezone) continue
      entry.job.stop()
      jobs.delete(key)
      nextRuns.delete(key)
    }

    for (const [key, job] of wanted) {
      if (jobs.has(key)) continue
      const created = new Cron(job.pattern, { protect: true, ...timezoneOption(timezone) }, () => {
        if (job.digest) track(runDigest(key, job.id))
        else track(runCollect(key, job.id))
      })
      jobs.set(key, { job: created, pattern: job.pattern, timezone })
    }

    for (const key of jobs.keys()) refreshNextRun(key)
  }

  return {
    sync,
    start(): void {
      sync()
    },
    async stop(): Promise<void> {
      for (const entry of jobs.values()) entry.job.stop()
      jobs.clear()
      nextRuns.clear()
      await Promise.allSettled(inFlight)
    },
    /** 卡片上的「下次采集时间」；没安排任务就是 null */
    nextRunAt(id: string): string | null {
      return jobs.has(id) ? (nextRuns.get(id) ?? null) : null
    },
  }
}

export type Scheduler = ReturnType<typeof createScheduler>
