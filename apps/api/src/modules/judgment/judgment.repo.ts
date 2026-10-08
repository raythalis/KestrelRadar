import { randomUUID } from 'node:crypto'

import type { Judgment } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { nowIso, parseStringArray } from '../../db/sql.ts'
import { dailySumColumns, type DayWindow } from '../../utils/day.ts'

interface JudgmentRow {
  id: string
  item_id: string
  monitor_id: string
  decision: string
  band: string
  score: number
  matched_keywords: string
  layer: string
  reasons: string
  llm_reason: string | null
  created_at: string
}

export interface NewJudgment {
  itemId: string
  monitorId: string
  decision: 'pass' | 'drop'
  band: 'high' | 'gray' | 'low'
  score: number
  matchedKeywords: string[]
  layer: 'keywords' | 'excludes' | 'score' | 'llm'
  reasons: string[]
  llmReason: string | null
}

export interface MonitorWindowStat {
  monitorId: string
  judged: number
  passed: number
  daily: number[]
}

function toJudgment(row: JudgmentRow): Judgment {
  return {
    id: row.id,
    itemId: row.item_id,
    monitorId: row.monitor_id,
    decision: row.decision as Judgment['decision'],
    band: row.band as Judgment['band'],
    score: row.score,
    matchedKeywords: parseStringArray(row.matched_keywords),
    layer: row.layer as Judgment['layer'],
    reasons: parseStringArray(row.reasons),
    llmReason: row.llm_reason,
    createdAt: row.created_at,
  }
}

export function createJudgmentRepo(db: Db) {
  const insertOne = db.prepare(
    `insert or ignore into judgments (id, item_id, monitor_id, decision, band, score, matched_keywords, layer,
       reasons, llm_reason, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const selectByMonitor = db.prepare(
    'select * from judgments where monitor_id = ? order by created_at desc, id',
  )
  const selectJudgedItemIds = db.prepare('select item_id from judgments where monitor_id = ?')
  const selectPassItemIds = db.prepare(
    `select distinct item_id from judgments
      where decision = 'pass' and monitor_id in (select value from json_each(?))`,
  )

  return {
    /** 一条内容对一条监听只判一次：重复调用靠库的唯一约束兜住 */
    insert(input: NewJudgment): boolean {
      const changes = insertOne.run(
        randomUUID(),
        input.itemId,
        input.monitorId,
        input.decision,
        input.band,
        input.score,
        JSON.stringify(input.matchedKeywords),
        input.layer,
        JSON.stringify(input.reasons),
        input.llmReason,
        nowIso(),
      ).changes
      return changes > 0
    },

    listByMonitor(monitorId: string): Judgment[] {
      return (selectByMonitor.all(monitorId) as unknown as JudgmentRow[]).map(toJudgment)
    },

    /** 这批监听判为「留下」的条目（投递的候选来源） */
    passItemIds(monitorIds: string[]): Set<string> {
      if (monitorIds.length === 0) return new Set()
      const rows = selectPassItemIds.all(JSON.stringify(monitorIds)) as unknown as {
        item_id: string
      }[]
      return new Set(rows.map((row) => row.item_id))
    },

    /**
     * 按监听的窗口汇总：筛选率看「命中 / 全部判定」，
     * 计数与 daily 都是命中条数。窗口内没有判定的监听不会出现在结果里。
     */
    monitorStatsSince(windows: DayWindow[]): MonitorWindowStat[] {
      const daily = dailySumColumns("case when decision = 'pass' then 1 else 0 end", windows)
      const first = windows[0]
      const last = windows[windows.length - 1]
      if (!first || !last) return []
      const rows = db
        .prepare(
          `select monitor_id,
             count(*) as judged,
             coalesce(sum(case when decision = 'pass' then 1 else 0 end), 0) as passed,
             ${daily.sql}
           from judgments
           where created_at >= ? and created_at < ?
           group by monitor_id`,
        )
        .all(...daily.params, first.start, last.end) as unknown as {
        monitor_id: string
        judged: number
        passed: number
        [column: `d${number}`]: number
      }[]
      return rows.map((row) => ({
        monitorId: row.monitor_id,
        judged: row.judged,
        passed: row.passed,
        daily: windows.map((_, index) => row[`d${index}`] ?? 0),
      }))
    },

    /** 这条监听已经判过的条目 id，用来跳过重复判定 */
    judgedItemIds(monitorId: string): Set<string> {
      const rows = selectJudgedItemIds.all(monitorId) as unknown as { item_id: string }[]
      return new Set(rows.map((row) => row.item_id))
    },
  }
}

export type JudgmentRepo = ReturnType<typeof createJudgmentRepo>
