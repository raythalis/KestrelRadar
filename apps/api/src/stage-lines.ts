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
}

/** 耗时写法：不足一分钟保留一位小数（`0.3 秒`、`12.4 秒`），跨分钟写成 `1 分 02 秒` */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return ''
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} 秒`
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒`
}

/** 有耗时就在句尾补一句「用时 X」，没有就不补 */
function withDuration(text: string, durationMs?: number): string {
  return durationMs === undefined ? text : `${text}，用时 ${formatDuration(durationMs)}`
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
  if (!facts.ok) {
    return {
      level: 'warn',
      message: withDuration(
        `采集「${facts.name}」失败：${facts.message ?? '没说明原因'}`,
        facts.durationMs,
      ),
    }
  }
  const counts =
    facts.newItemCount > 0
      ? `抓取 ${facts.foundCount} 条，新增 ${facts.newItemCount} 条`
      : `抓取 ${facts.foundCount} 条，没有新条目`
  return {
    level: 'info',
    message: withDuration(`采集「${facts.name}」完成：${counts}`, facts.durationMs),
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
    message: withDuration(`判定「${facts.name}」完成：新判 ${facts.written} 条`, facts.durationMs),
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
    message: withDuration(
      `归并「${facts.name}」完成：新建事件 ${facts.created} 个，并入 ${facts.merged} 条`,
      facts.durationMs,
    ),
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
  if (!facts.ok) {
    return {
      level: 'warn',
      message: withDuration(
        `投递「${facts.label}」失败：${facts.message ?? '没说明原因'}`,
        facts.durationMs,
      ),
    }
  }
  return {
    level: 'info',
    message: withDuration(
      `投递「${facts.label}」完成：${facts.messageCount} 条消息`,
      facts.durationMs,
    ),
  }
}

export interface StageFailFacts {
  /** 阶段动词：判定 / 归并 / 投递 */
  action: string
  /** 对象名：来源名之类 */
  object: string
  reason: string
}

/** 阶段整体没跑成（不是「这一轮没东西」）：写清哪一步、什么原因 */
export function stageFailLine(facts: StageFailFacts): StageLine {
  const reason = facts.reason || '没说明原因'
  return {
    level: 'warn',
    message: `${facts.action}「${facts.object}」失败：${reason}`,
  }
}
