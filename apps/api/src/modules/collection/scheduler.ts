import { Cron } from 'croner'

import type { CollectOutcome, Collector } from './collector.ts'

/**
 * 调度照 MoviePilot 的形态来：每个启用的发现注册成一个 cron 任务，由调度器自己
 * 持有「下次触发时间」并到点回调；不再靠「每分钟算一遍谁到期」那种轮询。
 */

/** 算下一次该跑的时间；cron 不合法返回 null */
export function nextRunAt(cronExpression: string, from: Date): Date | null {
  try {
    const job = new Cron(cronExpression, { paused: true })
    const next = job.nextRun(from)
    job.stop()
    return next
  } catch {
    return null
  }
}

export function isValidCron(cronExpression: string): boolean {
  return nextRunAt(cronExpression, new Date()) !== null
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
  /** 全局抓取并发上限，运行时读设置 */
  concurrency: () => number
  onResult?: (outcome: CollectOutcome) => void
}

interface JobEntry {
  job: Cron
  pattern: string
}

export function createScheduler(deps: SchedulerDeps) {
  const jobs = new Map<string, JobEntry>()
  const nextRuns = new Map<string, string | null>()
  let active = 0
  const waiting: Array<() => void> = []

  /** 有限并发：同时在跑的采集不超过设置里的上限 */
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

  function refreshNextRun(id: string): void {
    nextRuns.set(id, jobs.get(id)?.job.nextRun()?.toISOString() ?? null)
  }

  async function runJob(id: string): Promise<void> {
    try {
      const outcome = await withSlot(() => deps.collector.collectDiscovery(id))
      deps.onResult?.(outcome)
    } catch (error) {
      // 单个源炸了不能拖死调度器，也不能影响别的源
      deps.onResult?.({
        discoveryId: id,
        ok: false,
        routeOk: false,
        contentOk: false,
        newItemCount: 0,
        message: (error as Error).message || '采集失败',
      })
    } finally {
      refreshNextRun(id)
    }
  }

  /** 让任务表跟发现表对齐：该建的建、频率变了的换、停用或删掉的撤 */
  function sync(): void {
    const wanted = new Map(
      deps
        .targets()
        .filter((target) => target.enabled)
        .map((target) => [target.id, target.cronExpression]),
    )

    const stale: string[] = []
    for (const [id, entry] of jobs) {
      if (wanted.get(id) !== entry.pattern) stale.push(id)
    }
    for (const id of stale) {
      jobs.get(id)?.job.stop()
      jobs.delete(id)
      nextRuns.delete(id)
    }

    for (const [id, pattern] of wanted) {
      if (jobs.has(id) || !isValidCron(pattern)) continue
      const job = new Cron(pattern, { protect: true }, () => {
        void runJob(id)
      })
      jobs.set(id, { job, pattern })
    }

    for (const id of jobs.keys()) refreshNextRun(id)
  }

  return {
    sync,
    start(): void {
      sync()
    },
    stop(): void {
      for (const entry of jobs.values()) entry.job.stop()
      jobs.clear()
      nextRuns.clear()
    },
    /** 卡片上的「下次采集时间」；没安排任务就是 null */
    nextRunAt(id: string): string | null {
      return jobs.has(id) ? (nextRuns.get(id) ?? null) : null
    },
  }
}

export type Scheduler = ReturnType<typeof createScheduler>
