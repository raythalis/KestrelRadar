import { randomUUID } from 'node:crypto'

import type { Action, CreateActionInput, UpdateActionInput } from '@kestrel/contracts'

import type { Db } from '../../db/index.ts'
import { fromBool, nowIso, toBool } from '../../db/sql.ts'

interface ActionRow {
  id: string
  group_id: string
  name: string
  trigger_type: string
  channel_id: string
  cron_expression: string | null
  template_id: string | null
  include_delivered: number
  merge_messages: number
  enabled: number
  created_at: string
  updated_at: string
}

function toAction(row: ActionRow): Action {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    triggerType: row.trigger_type as Action['triggerType'],
    channelId: row.channel_id,
    cronExpression: row.cron_expression,
    templateId: row.template_id,
    includeDelivered: toBool(row.include_delivered),
    mergeMessages: toBool(row.merge_messages),
    enabled: toBool(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createActionRepo(db: Db) {
  const selectAll = db.prepare('select * from actions order by created_at, id')
  const selectOne = db.prepare('select * from actions where id = ?')
  const insertOne = db.prepare(
    `insert into actions (id, group_id, name, trigger_type, channel_id, cron_expression, template_id,
       include_delivered, merge_messages, enabled, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const updateOne = db.prepare(
    `update actions set name = ?, trigger_type = ?, channel_id = ?, cron_expression = ?,
       template_id = ?, include_delivered = ?, merge_messages = ?, enabled = ?, updated_at = ? where id = ?`,
  )

  const setEnabledByGroupOne = db.prepare(
    'update actions set enabled = ?, updated_at = ? where group_id = ?',
  )

  function find(id: string): ActionRow | undefined {
    return selectOne.get(id) as unknown as ActionRow | undefined
  }

  return {
    list(): Action[] {
      return (selectAll.all() as unknown as ActionRow[]).map(toAction)
    },

    get(id: string): Action | undefined {
      const row = find(id)
      return row ? toAction(row) : undefined
    },

    create(input: CreateActionInput): Action {
      const now = nowIso()
      const id = randomUUID()
      insertOne.run(
        id,
        input.groupId,
        input.name,
        input.triggerType,
        input.channelId,
        input.cronExpression,
        input.templateId,
        fromBool(input.includeDelivered),
        fromBool(input.mergeMessages),
        fromBool(input.enabled),
        now,
        now,
      )
      const created = find(id)
      if (!created) throw new Error('写入动作后读不回来')
      return toAction(created)
    },

    update(id: string, patch: UpdateActionInput): Action | undefined {
      const current = find(id)
      if (!current) return undefined
      updateOne.run(
        patch.name ?? current.name,
        patch.triggerType ?? current.trigger_type,
        patch.channelId ?? current.channel_id,
        patch.cronExpression === undefined ? current.cron_expression : patch.cronExpression,
        patch.templateId === undefined ? current.template_id : patch.templateId,
        fromBool(patch.includeDelivered ?? toBool(current.include_delivered)),
        fromBool(patch.mergeMessages ?? toBool(current.merge_messages)),
        fromBool(patch.enabled ?? toBool(current.enabled)),
        nowIso(),
        id,
      )
      const updated = find(id)
      return updated ? toAction(updated) : undefined
    },

    remove(id: string): boolean {
      return db.prepare('delete from actions where id = ?').run(id).changes > 0
    },

    /** 分组开关往下传：一次改一组的动作 */
    setEnabledByGroup(groupId: string, enabled: boolean): void {
      setEnabledByGroupOne.run(fromBool(enabled), nowIso(), groupId)
    },
  }
}

export type ActionRepo = ReturnType<typeof createActionRepo>
