import { randomUUID } from 'node:crypto'

import type { Incident, IncidentKind, IncidentStatus } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'

interface IncidentRow {
  id: string
  kind: string
  target_id: string
  target_name: string
  group_id: string | null
  group_name: string
  code: string
  message: string
  detail: string | null
  status: string
  dismissed_at: string | null
  first_seen_at: string
  created_at: string
}

export interface NewIncident {
  kind: IncidentKind
  targetId: string
  targetName: string
  groupId: string | null
  groupName: string
  code: string
  message: string
  detail?: string | null
}

/** 库里只留最近若干条，超出时按「先挤已忽视的、再挤最旧的」腾位置 */
export function createIncidentRepo(db: Db) {
  const insertOne = db.prepare(
    `insert into incidents (id, kind, target_id, target_name, group_id, group_name, code, message,
       detail, status, dismissed_at, first_seen_at, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', null, ?, ?)`,
  )
  const selectById = db.prepare('select * from incidents where id = ?')
  const selectRecent = db.prepare(
    'select * from incidents order by created_at desc, rowid desc limit ?',
  )
  const selectRecentOpen = db.prepare(
    `select * from incidents where status = 'open' order by created_at desc, rowid desc limit ?`,
  )
  const selectRepeat = db.prepare(
    `select * from incidents where kind = ? and target_id = ? and code = ? and created_at >= ?
     order by created_at desc limit 1`,
  )
  const touchOne = db.prepare(
    'update incidents set message = ?, detail = ?, created_at = ? where id = ?',
  )
  const dismissOne = db.prepare(
    `update incidents set status = 'dismissed', dismissed_at = ? where id = ?`,
  )
  const countAll = db.prepare('select count(*) as n from incidents')
  const selectOldest = db.prepare(
    'select id from incidents order by created_at asc, rowid asc limit ?',
  )
  const selectOldestDismissed = db.prepare(
    `select id from incidents where status = 'dismissed' order by created_at asc, rowid asc limit ?`,
  )
  const deleteOne = db.prepare('delete from incidents where id = ?')

  function toIncident(row: IncidentRow): Incident {
    return {
      id: row.id,
      kind: row.kind as IncidentKind,
      targetId: row.target_id,
      targetName: row.target_name,
      groupId: row.group_id,
      groupName: row.group_name,
      code: row.code,
      message: row.message,
      detail: row.detail,
      status: row.status as IncidentStatus,
      dismissedAt: row.dismissed_at,
      firstSeenAt: row.first_seen_at,
      createdAt: row.created_at,
    }
  }

  function rows(raw: unknown): Incident[] {
    return (raw as IncidentRow[]).map(toIncident)
  }

  return {
    create(input: NewIncident, at: string): Incident {
      const id = randomUUID()
      insertOne.run(
        id,
        input.kind,
        input.targetId,
        input.targetName,
        input.groupId,
        input.groupName,
        input.code,
        input.message,
        input.detail ?? null,
        at,
        at,
      )
      const row = selectById.get(id) as unknown as IncidentRow
      return toIncident(row)
    },

    /** 同一条错误在窗口内又发生了一次：更新时间与文案，首次时间不动 */
    touch(id: string, message: string, detail: string | null, at: string): Incident {
      touchOne.run(message, detail, at, id)
      return toIncident(selectById.get(id) as unknown as IncidentRow)
    },

    findRepeat(kind: string, targetId: string, code: string, sinceIso: string): Incident | null {
      const row = selectRepeat.get(kind, targetId, code, sinceIso) as unknown as
        IncidentRow | undefined
      return row ? toIncident(row) : null
    },

    get(id: string): Incident | null {
      const row = selectById.get(id) as unknown as IncidentRow | undefined
      return row ? toIncident(row) : null
    },

    /** 前端展示用：只看没被忽视的 */
    listOpen(limit: number): Incident[] {
      return rows(selectRecentOpen.all(limit))
    },

    listRecent(limit: number): Incident[] {
      return rows(selectRecent.all(limit))
    },

    dismiss(id: string, at: string): boolean {
      return dismissOne.run(at, id).changes > 0
    },

    count(): number {
      return (countAll.get() as unknown as { n: number }).n
    },

    /** 超出上限就往回收：先删最旧的已忽视记录，还不够再删最旧的 */
    prune(limit: number): number {
      let over = this.count() - limit
      if (over <= 0) return 0
      let removed = 0
      for (const row of selectOldestDismissed.all(over) as unknown as { id: string }[]) {
        deleteOne.run(row.id)
        removed += 1
      }
      over = this.count() - limit
      if (over > 0) {
        for (const row of selectOldest.all(over) as unknown as { id: string }[]) {
          deleteOne.run(row.id)
          removed += 1
        }
      }
      return removed
    },
  }
}

export type IncidentRepo = ReturnType<typeof createIncidentRepo>
