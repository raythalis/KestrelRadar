import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'
import { openDatabase } from '../src/db/index.ts'
import { createTempDb } from './helpers/temp-db.ts'

let cleanup: () => void
let container: Container

beforeEach(() => {
  const db = createTempDb()
  cleanup = db.cleanup
  container = buildContainer(openDatabase(db.path))
})

afterEach(() => cleanup())

describe('消息模板库', () => {
  it('内置模板排在最前，且标成只读', () => {
    const list = container.templates.list()
    expect(list).toHaveLength(2)
    expect(list[0]?.builtin).toBe(true)
    expect(list[0]?.name).toContain('系统内置')
    expect(list[1]?.builtin).toBe(true)
    // 内置模板没有自己写变量之外的东西：内容就是默认那套
    expect(list[0]?.content).toContain('{{title}}')
  })

  it('可以新增、改名、改内容、删除自定义模板', () => {
    const created = container.templates.create({ name: '简短版', content: '{{title}}' })
    expect(container.templates.list()).toHaveLength(3)
    expect(created.builtin).toBe(false)

    const renamed = container.templates.update(created.id, { name: '更短版' })
    expect(renamed.name).toBe('更短版')

    const rewritten = container.templates.update(created.id, { content: '【{{group}}】{{title}}' })
    expect(rewritten.content).toBe('【{{group}}】{{title}}')

    container.templates.remove(created.id)
    expect(container.templates.list()).toHaveLength(2)
  })

  it('内置模板不许改也不许删', () => {
    const builtinId = container.templates.list()[0]!.id
    expect(() => container.templates.update(builtinId, { name: '改名试试' })).toThrow(/内置/)
    expect(() => container.templates.remove(builtinId)).toThrow(/内置/)
    expect(container.templates.list()).toHaveLength(2)
  })

  it('改不存在的模板报 not_found', () => {
    expect(() => container.templates.update('nope', { name: 'x开' })).toThrow(/没有这个模板/)
    expect(() => container.templates.remove('nope')).toThrow(/没有这个模板/)
  })

  it('动作没选模板时按界面语言用内置模板，选了就用选中的', () => {
    expect(container.templates.contentFor(null, 'zh')).toContain('来源 {{sourceCount}} 个')
    expect(container.templates.contentFor(null, 'en')).toContain('{{sourceCount}} sources')

    const custom = container.templates.create({ name: '英文简短', content: '{{title}} — {{url}}' })
    expect(container.templates.contentFor(custom.id, 'zh')).toBe('{{title}} — {{url}}')
  })
})
