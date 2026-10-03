import { randomUUID } from 'node:crypto'

import type { Db } from '../../db/index.ts'
import { nowIso, parseStringArray } from '../../db/sql.ts'

export interface Delivery {
  id: string
  actionId: string
  channelId: string
  triggerType: 'instant' | 'digest'
  eventIds: string[]
  status: 'sent' | 'failed'
  message: string
  error: string | null
  createdAt: string
}

interface DeliveryRow {
  id: string
  action_id: string
  channel_id: string
  trigger_type: string
  event_ids: string
  status: string
  message: string
  error: string | null
  created_at: string
}

function toDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    actionId: row.action_id,
    channelId: row.channel_id,
    triggerType: row.trigger_type as Delivery['triggerType'],
    eventIds: parseStringArray(row.event_ids),
    status: row.status as Delivery['status'],
    message: row.message,
    error: row.error,
    createdAt: row.created_at,
  }
}

export interface NewDelivery {
  actionId: string
  channelId: string
  triggerType: 'instant' | 'digest'
  eventIds: string[]
  status: 'sent' | 'failed'
  message: string
  error: string | null
}

export function createDeliveryRepo(db: Db) {
  const insertOne = db.prepare(
    `insert into deliveries (id, action_id, channel_id, trigger_type, event_ids, status, message, error, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertDeliveredItem = db.prepare(
    `insert or ignore into delivered_items (action_id, item_id, delivery_id, created_at) values (?, ?, ?, ?)`,
  )
  const selectByAction = db.prepare(
    'select * from deliveries where action_id = ? order by created_at desc, id limit ?',
  )
  const selectDeliveredItems = db.prepare('select item_id from delivered_items where action_id = ?')
  const selectAnyDeliveredItems = db.prepare('select distinct item_id from delivered_items')
  const selectSentEventIds = db.prepare(
    "select event_ids from deliveries where action_id = ? and status = 'sent'",
  )
  const countSentSince = db.prepare(
    "select count(*) as total from deliveries where status = 'sent' and created_at >= ?",
  )
  const countByStatus = db.prepare(
    'select count(*) as total from deliveries where status = ? and created_at >= ?',
  )

  return {
    create(input: NewDelivery): Delivery {
      const id = randomUUID()
      insertOne.run(
        id,
        input.actionId,
        input.channelId,
        input.triggerType,
        JSON.stringify(input.eventIds),
        input.status,
        input.message,
        input.error,
        nowIso(),
      )
      const row = db
        .prepare('select * from deliveries where id = ?')
        .get(id) as unknown as DeliveryRow
      return toDelivery(row)
    },

    /** 幂等的底账：这条内容在这个动作上投过了就不会再投 */
    markItemsDelivered(deliveryId: string, actionId: string, itemIds: string[]): void {
      const now = nowIso()
      for (const itemId of itemIds) insertDeliveredItem.run(actionId, itemId, deliveryId, now)
    },

    deliveredItemIds(actionId: string): Set<string> {
      const rows = selectDeliveredItems.all(actionId) as unknown as { item_id: string }[]
      return new Set(rows.map((row) => row.item_id))
    },

    /** 所有动作投过的内容（汇总动作「包含已即时推送过的内容」开关用它） */
    anyDeliveredItemIds(): Set<string> {
      const rows = selectAnyDeliveredItems.all() as unknown as { item_id: string }[]
      return new Set(rows.map((row) => row.item_id))
    },

    /** 这个动作已经投过哪些事件（事件层的「不重复推」按动作算） */
    sentEventIds(actionId: string): Set<string> {
      const rows = selectSentEventIds.all(actionId) as unknown as { event_ids: string }[]
      const ids = new Set<string>()
      for (const row of rows) for (const id of parseStringArray(row.event_ids)) ids.add(id)
      return ids
    },

    /** 今天已经成功发了几条（每日投递上限用它） */
    countSentSince(iso: string): number {
      const row = countSentSince.get(iso) as unknown as { total: number }
      return row.total
    },

    /** 某个状态在某个时间点之后有几条（投递成功率用它） */
    countByStatusSince(status: 'sent' | 'failed', iso: string): number {
      const row = countByStatus.get(status, iso) as unknown as { total: number }
      return row.total
    },

    listByAction(actionId: string, limit = 50): Delivery[] {
      return (selectByAction.all(actionId, limit) as unknown as DeliveryRow[]).map(toDelivery)
    },
  }
}

export type DeliveryRepo = ReturnType<typeof createDeliveryRepo>
