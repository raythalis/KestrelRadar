import type {
  CreateMessageTemplateInput,
  MessageTemplate,
  UpdateMessageTemplateInput,
} from '@kestrel/contracts'
import { randomUUID } from 'node:crypto'

import type { Db } from '../../db/index.ts'

interface TemplateRow {
  id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

function toTemplate(row: TemplateRow): MessageTemplate {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    builtin: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 只存用户自己建的模板；系统内置的由代码提供 */
export function createTemplateRepo(db: Db) {
  const selectAll = db.prepare('select * from message_templates order by created_at')
  const selectOne = db.prepare('select * from message_templates where id = ?')
  const insert = db.prepare(
    `insert into message_templates (id, name, content, created_at, updated_at)
     values (?, ?, ?, ?, ?)`,
  )
  const update = db.prepare(
    'update message_templates set name = ?, content = ?, updated_at = ? where id = ?',
  )
  const remove = db.prepare('delete from message_templates where id = ?')

  return {
    list(): MessageTemplate[] {
      return (selectAll.all() as unknown as TemplateRow[]).map(toTemplate)
    },

    get(id: string): MessageTemplate | null {
      const row = selectOne.get(id) as unknown as TemplateRow | undefined
      return row ? toTemplate(row) : null
    },

    create(input: CreateMessageTemplateInput): MessageTemplate {
      const now = new Date().toISOString()
      const id = randomUUID()
      insert.run(id, input.name, input.content, now, now)
      return toTemplate({
        id,
        name: input.name,
        content: input.content,
        created_at: now,
        updated_at: now,
      })
    },

    update(id: string, patch: UpdateMessageTemplateInput): MessageTemplate | null {
      const current = this.get(id)
      if (!current) return null
      const name = patch.name ?? current.name
      const content = patch.content ?? current.content
      const now = new Date().toISOString()
      update.run(name, content, now, id)
      return toTemplate({
        id,
        name,
        content,
        created_at: current.createdAt ?? now,
        updated_at: now,
      })
    },

    remove(id: string): void {
      remove.run(id)
    },
  }
}

export type TemplateRepo = ReturnType<typeof createTemplateRepo>
