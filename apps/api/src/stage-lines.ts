/**
 * 流程阶段行：采集、判定、归并、投递各自一行，形状统一。
 *
 * 只做拼装，不读库、不看时间，方便逐条测；真实事实由装配处（container.ts）采集。
 * 词表与句式见 `.ai/plans/log-and-startup-style.md`：
 * 阶段动词 + 对象 + `……` + 结果标记 + `（细节 · 耗时）`，中间用 `·` 分隔。
 */

export interface StageLine {
  level: 'info' | 'warn' | 'error'
  message: string
  fields: Record<string, unknown>
}

/** 耗时写法：不足一分钟保留一位小数（`0.3s`、`12.4s`），跨分钟写成 `1m02s` */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return ''
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m${String(seconds).padStart(2, '0')}s`
}

/** 括号里的细节段：有耗时就跟在最后 */
function detail(parts: string[], durationMs?: number): string {
  const withDuration = durationMs === undefined ? parts : [...parts, formatDuration(durationMs)]
  return withDuration.join(' · ')
}

export interface CollectFacts {
  name: string
  ok: boolean
  foundCount: number
  newItemCount: number
  code?: string
  message?: string
  durationMs?: number
}

export function collectLine(facts: CollectFacts): StageLine {
  const fields = {
    stage: 'collect',
    object: facts.name,
    result: facts.ok ? 'ok' : 'failed',
    found: facts.foundCount,
    new_items: facts.newItemCount,
    ...(facts.code ? { code: facts.code } : {}),
    ...(facts.durationMs === undefined ? {} : { duration_ms: facts.durationMs }),
  }
  if (!facts.ok) {
    return {
      level: 'warn',
      message: `采集「${facts.name}」 …… 失败（${facts.message ?? '没说明原因'} · ${formatDuration(facts.durationMs)}）`,
      fields,
    }
  }
  const counts =
    facts.newItemCount > 0
      ? `抓取 ${facts.foundCount} 条 · 新增 ${facts.newItemCount} 条`
      : `没有新条目（抓取 ${facts.foundCount} 条）`
  return {
    level: 'info',
    message: `采集「${facts.name}」 …… 完成（${detail([counts], facts.durationMs)}）`,
    fields,
  }
}

export interface JudgeFacts {
  name: string
  written: number
  durationMs?: number
}

export function judgeLine(facts: JudgeFacts): StageLine {
  return {
    level: 'info',
    message: `判定「${facts.name}」 …… 完成（新判 ${facts.written} 条 · ${formatDuration(facts.durationMs)}）`,
    fields: {
      stage: 'judge',
      object: facts.name,
      result: 'ok',
      judged: facts.written,
      ...(facts.durationMs === undefined ? {} : { duration_ms: facts.durationMs }),
    },
  }
}

export interface MergeFacts {
  name: string
  created: number
  merged: number
  durationMs?: number
}

export function mergeLine(facts: MergeFacts): StageLine {
  return {
    level: 'info',
    message: `归并「${facts.name}」 …… 完成（新建事件 ${facts.created} 个 · 并入 ${facts.merged} 条 · ${formatDuration(facts.durationMs)}）`,
    fields: {
      stage: 'merge',
      object: facts.name,
      result: 'ok',
      created: facts.created,
      merged: facts.merged,
      ...(facts.durationMs === undefined ? {} : { duration_ms: facts.durationMs }),
    },
  }
}

export interface DeliveryFacts {
  /** 投递对象的名字：动作名或渠道名 */
  label: string
  ok: boolean
  messageCount: number
  message?: string
  durationMs?: number
}

export function deliveryLine(facts: DeliveryFacts): StageLine {
  const fields = {
    stage: 'delivery',
    object: facts.label,
    result: facts.ok ? 'ok' : 'failed',
    message_count: facts.messageCount,
    ...(facts.durationMs === undefined ? {} : { duration_ms: facts.durationMs }),
  }
  if (!facts.ok) {
    return {
      level: 'warn',
      message: `投递「${facts.label}」 …… 失败（${facts.message ?? '没说明原因'} · ${formatDuration(facts.durationMs)}）`,
      fields,
    }
  }
  return {
    level: 'info',
    message: `投递「${facts.label}」 …… 完成（${facts.messageCount} 条消息 · ${formatDuration(facts.durationMs)}）`,
    fields,
  }
}

export interface StageFailFacts {
  /** 阶段动词：判定 / 归并 / 投递 */
  action: string
  /** 机器可读的阶段名，进日志字段 */
  stage: string
  /** 对象名：来源名之类 */
  object: string
  reason: string
}

/** 阶段整体没跑成（不是「这一轮没东西」）：写清哪一步、什么原因 */
export function stageFailLine(facts: StageFailFacts): StageLine {
  const reason = facts.reason || '没说明原因'
  return {
    level: 'warn',
    message: `${facts.action}「${facts.object}」 …… 失败（${reason}）`,
    fields: { stage: facts.stage, object: facts.object, result: 'failed', reason },
  }
}
