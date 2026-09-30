import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'
import { countCards, useWorkspaceStore } from '@/stores/workspace'

vi.mock('@/api/workspace', () => ({
  fetchWorkspace: vi.fn(async () => {
    throw new Error('backend offline')
  }),
}))

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('countCards', () => {
  it('按卡片类型分别计数', () => {
    const cards = [
      { id: 'a', kind: 'source' },
      { id: 'b', kind: 'source' },
      { id: 'c', kind: 'watcher' },
      { id: 'd', kind: 'action' },
    ] as never
    expect(countCards(cards)).toEqual({ source: 2, watcher: 1, action: 1 })
  })
})

describe('workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('默认使用示例数据并给出正确汇总', () => {
    const store = useWorkspaceStore()
    expect(store.dataSource).toBe('sample')
    expect(store.summary.groups).toBe(store.groups.length)
    expect(store.summary.sources).toBeGreaterThan(0)
    expect(store.summary.watchers).toBeGreaterThan(0)
  })

  it('后端不可用时回退到示例数据并记录错误', async () => {
    const store = useWorkspaceStore()
    const source = await store.load()
    expect(source).toBe('sample')
    expect(store.lastError).toContain('backend offline')
    expect(store.groups.length).toBeGreaterThan(0)
  })
})

describe('i18n 词条', () => {
  it('中英文 key 完全对齐', () => {
    expect(flattenKeys(zhCN).sort()).toEqual(flattenKeys(en).sort())
  })
})
