import { Cron } from 'croner'

import type { Collector } from './collector.ts'

/** 算下一次该跑的时间；cron 不合法就返回 null（当它不存在，不炸） */
export function nextRunAt(cronExpression: string, from: Date): Date | null {
  try {
    const job = new Cron(cronExpression, { paused: true })
    return job.nextRun(from)
  } catch {
    return null
  }
}

/** 「到期」是算出来的：上次跑过的时间往后推一格，到了就该跑，不额外存待办表 */
export function isDue(
  target: { cronExpression: string; lastCheckedAt: string | null; enabled?: boolean },
  now: Date,
): boolean {
  if (target.enabled === false) return false
  const anchor = target.lastCheckedAt ? new Date(target.lastCheckedAt) : new Date(0)
  if (Number.isNaN(anchor.getTime())) return false
  const next = nextRunAt(target.cronExpression, anchor)
  if (!next) return false
  return next.getTime() <= now.getTime()
}

export interface SchedulerDeps {
  collector: Collector
  intervalMs?: number
  onTick?: (outcomes: Awaited<ReturnType<Collector['collectDue']>>) => void
}

const DEFAULT_INTERVAL_MS = 60_000

export function createScheduler(deps: SchedulerDeps) {
  let timer: NodeJS.Timeout | null = null
  let running = false

  async function tick(now = new Date()): Promise<void> {
    if (running) return
    running = true
    try {
      const outcomes = await deps.collector.collectDue(now)
      if (outcomes.length > 0) deps.onTick?.(outcomes)
    } finally {
      running = false
    }
  }

  return {
    tick,
    start(): void {
      if (timer) return
      timer = setInterval(() => {
        void tick()
      }, deps.intervalMs ?? DEFAULT_INTERVAL_MS)
    },
    stop(): void {
      if (!timer) return
      clearInterval(timer)
      timer = null
    },
  }
}

export type Scheduler = ReturnType<typeof createScheduler>
