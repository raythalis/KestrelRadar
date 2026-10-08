import { describe, expect, it } from 'vitest'
import zh from '../locales/zh-CN.ts'
import en from '../locales/en.ts'

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(strings)
}

describe('discovery terminology', () => {
  it('uses discovery as the entity name in both locales', () => {
    expect(zh.column.discoveries).toBe('发现')
    expect(en.column.discoveries).toBe('Discoveries')
    expect(zh.discovery.add).toBe('添加发现')
    expect(en.discovery.add).toBe('Add discovery')
    expect(zh.incident.discovery.missing).toBe('这个发现不存在')
    expect(en.incident.discovery.missing).toBe('This discovery no longer exists')
  })

  it('does not use data source as the discovery entity name', () => {
    expect(strings(zh).filter((text) => text.includes('数据源'))).toEqual([])
    expect(strings(en).filter((text) => /data sources?/i.test(text))).toEqual([])
  })
})
