import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'

let cleanup: () => void
let container: Container

beforeEach(() => {
  const db = createTempDb()
  cleanup = db.cleanup
  container = buildContainer(openTestDatabase(db.path))
})

afterEach(() => cleanup())

describe('消息模板库', () => {
  it('只有一个内置默认模板，排在最前且标成只读、名称走 i18n', () => {
    const list = container.templates.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.builtin).toBe(true)
    // 名称不写死文案，交给前端按语言翻译
    expect(list[0]?.nameKey).toBe('template.builtinDefault')
    expect(list[0]?.content).toContain('{{title}}')
  })

  it('可以新增、改名、改内容、删除自定义模板', () => {
    const created = container.templates.create({ name: '简短版', content: '{{title}}' })
    expect(container.templates.list()).toHaveLength(2)
    expect(created.builtin).toBe(false)
    expect(created.nameKey).toBeNull()

    const renamed = container.templates.update(created.id, { name: '更短版' })
    expect(renamed.name).toBe('更短版')

    const rewritten = container.templates.update(created.id, { content: '【{{group}}】{{title}}' })
    expect(rewritten.content).toBe('【{{group}}】{{title}}')

    container.templates.remove(created.id)
    expect(container.templates.list()).toHaveLength(1)
  })

  it('内置模板不许改也不许删', () => {
    const builtinId = container.templates.list()[0]!.id
    expect(() => container.templates.update(builtinId, { name: '改名试试' })).toThrow(/内置/)
    expect(() => container.templates.remove(builtinId)).toThrow(/内置/)
    expect(container.templates.list()).toHaveLength(1)
  })

  it('改不存在的模板报 not_found', () => {
    expect(() => container.templates.update('nope', { name: 'x开' })).toThrow(/没有这个模板/)
    expect(() => container.templates.remove('nope')).toThrow(/没有这个模板/)
  })

  it('动作没选模板就用内置默认模板，选了就用选中的', () => {
    expect(container.templates.contentFor(null)).toContain('来源 {{sourceCount}} 个')

    const custom = container.templates.create({ name: '简短', content: '{{title}} — {{url}}' })
    expect(container.templates.contentFor(custom.id)).toBe('{{title}} — {{url}}')
  })
})
