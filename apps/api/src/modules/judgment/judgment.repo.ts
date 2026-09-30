import { randomUUID } from 'node:crypto'

import type { Judgment } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { nowIso, parseStringArray } from '../../db/sql.ts'

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

    /** 这条监听已经判过的条目 id，用来跳过重复判定 */
    judgedItemIds(monitorId: string): Set<string> {
      const rows = selectJudgedItemIds.all(monitorId) as unknown as { item_id: string }[]
      return new Set(rows.map((row) => row.item_id))
    },
  }
}

export type JudgmentRepo = ReturnType<typeof createJudgmentRepo>
