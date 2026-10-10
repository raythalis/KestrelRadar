import type { FastifyBaseLogger } from 'fastify'
import { describe, expect, it } from 'vitest'

import { runSafely } from '../src/background.ts'

function createLog(): { log: FastifyBaseLogger; lines: string[] } {
  const lines: string[] = []
  const record =
    (level: string) =>
    (_fields: unknown, message?: string): void => {
      lines.push(`${level}:${message ?? ''}`)
    }
  const log = {
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
  } as unknown as FastifyBaseLogger
  return { log, lines }
}

describe('后台任务兜底', () => {
  it('任务抛错：只记一条警告，不往外抛', async () => {
    const { log, lines } = createLog()
    const ok = await runSafely(
      '定时清理',
      () => {
        throw new Error('database is locked')
      },
      log,
    )
    expect(ok).toBe(false)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('warn:定时清理 失败')
    expect(lines[0]).toContain('下一轮照常重试')
  })

  it('任务正常：什么都不记，返回 true（异步任务同样）', async () => {
    const { log, lines } = createLog()
    const ok = await runSafely(
      '定时清理',
      async () => {
        await Promise.resolve()
      },
      log,
    )
    expect(ok).toBe(true)
    expect(lines).toEqual([])
  })

  it('错误本体带进日志字段，方便排障', async () => {
    const fields: unknown[] = []
    const log = {
      warn: (value: unknown) => fields.push(value),
    } as unknown as FastifyBaseLogger
    await runSafely(
      '定时清理',
      () => {
        throw new Error('boom')
      },
      log,
    )
    expect(fields).toHaveLength(1)
    expect((fields[0] as { err?: Error }).err?.message).toBe('boom')
  })
})
