import { describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.ts'
import { createTempDb } from './helpers/temp-db.ts'

/** 把 pino 的输出抓成数组，逐行断言 */
async function harness() {
  const db = createTempDb()
  const lines: string[] = []
  const app = await buildApp({
    dbPath: db.path,
    enableScheduler: false,
    logger: { level: 'info', stream: { write: (chunk: string) => lines.push(chunk.trim()) } },
  })
  await app.ready()
  return {
    app,
    lines,
    find: (needle: string) => lines.filter((line) => line.includes(needle)),
    cleanup: async () => {
      await app.close()
      db.cleanup()
    },
  }
}

describe('请求行', () => {
  it('常规接口一行一条：方法、路径、状态码、耗时', async () => {
    const { app, cleanup, find } = await harness()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/groups' })
      expect(res.statusCode).toBe(200)

      const hits = find('GET /api/groups 200')
      expect(hits).toHaveLength(1)
      const entry = JSON.parse(hits[0]!) as { level: number; msg: string }
      expect(entry.msg).toMatch(/^GET \/api\/groups 200，用时 \d+ms$/)
      expect(entry.level).toBe(30)
      // 行尾不再挂字段：整行就一句人话（pino 自带的那几个除外）
      const extras = Object.keys(entry).filter(
        (key) => !['level', 'time', 'pid', 'hostname', 'msg'].includes(key),
      )
      expect(extras).toEqual([])
    } finally {
      await cleanup()
    }
  })

  it('健康检查不逐条打（不然每 30 秒刷一行）', async () => {
    const { app, cleanup, lines } = await harness()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/health' })
      expect(res.statusCode).toBe(200)
      expect(lines.some((line) => line.includes('/api/health'))).toBe(false)
    } finally {
      await cleanup()
    }
  })

  it('4xx 记 warn 并带上错误码；5xx 记 error', async () => {
    const { app, cleanup, find } = await harness()
    try {
      await app.inject({ method: 'GET', url: '/api/groups/does-not-exist' })
      const notFound = find('GET /api/groups/does-not-exist 404')
      expect(notFound).toHaveLength(1)
      const entry = JSON.parse(notFound[0]!) as { level: number; msg: string }
      expect(entry.level).toBe(40)
      expect(entry.msg).toBe('GET /api/groups/does-not-exist 404，NOT_FOUND')

      await app.inject({ method: 'POST', url: '/api/groups', payload: { name: '' } })
      const invalid = find('POST /api/groups 400')
      expect(invalid).toHaveLength(1)
      const entry2 = JSON.parse(invalid[0]!) as { level: number; msg: string }
      expect(entry2.level).toBe(40)
      expect(entry2.msg).toBe('POST /api/groups 400，VALIDATION_ERROR')
    } finally {
      await cleanup()
    }
  })

  it('前端页面路由与静态资源不占日志', async () => {
    const { app, cleanup, lines } = await harness()
    try {
      await app.inject({ method: 'GET', url: '/dashboard' })
      expect(lines.some((line) => line.includes('/dashboard'))).toBe(false)
    } finally {
      await cleanup()
    }
  })
})
