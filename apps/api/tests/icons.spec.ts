import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildContainer, type Container } from '../src/container.ts'

import { registerIconRoutes } from '../src/modules/icons/icon.routes.ts'
import { createIconService } from '../src/modules/icons/icon.service.ts'
import { createTempDb, openTestDatabase } from './helpers/temp-db.ts'

/** 一张 1x1 的 PNG，够过文件头检查 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
)
const HTML = Buffer.from('<!doctype html><html><body>这里没有图</body></html>')

let cleanup: () => void
let iconDir: string
let dbPath: string
let calls: string[]

function imageFetch(body: Buffer | null): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    if (!body) return new Response('nope', { status: 404 })
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })
  }) as typeof fetch
}

function build(fetchImpl: typeof fetch): Container {
  return buildContainer(openTestDatabase(dbPath), { iconDir, fetchImpl })
}

function seedDiscovery(
  container: Container,
  name: string,
  target: string,
  kind: 'rss' | 'rsshub' = 'rss',
): string {
  const group = container.groups.create({ name: `分组-${name}`, description: '', enabled: true })
  return container.discoveries.create({
    groupId: group.id,
    name,
    kind,
    target,
    cronExpression: '0 * * * *',
    enabled: true,
  }).id
}

beforeEach(() => {
  const db = createTempDb()
  cleanup = db.cleanup
  dbPath = db.path
  iconDir = mkdtempSync(join(tmpdir(), 'kestrel-icons-'))
  calls = []
})

afterEach(() => {
  cleanup()
  rmSync(iconDir, { recursive: true, force: true })
})

describe('图标地址解析', () => {
  it('只认公网域名；内网、IP、RSSHub 相对路由都不抓', () => {
    const icons = createIconService({ discoveries: undefined as never, dir: iconDir })
    expect(icons.hostOf('https://example.com/feed.xml', 'rss')).toBe('example.com')
    expect(icons.hostOf('https://News.YCombinator.com/rss', 'rss')).toBe('news.ycombinator.com')
    expect(icons.hostOf('example.com/feed.xml', 'rss')).toBe('example.com')
    expect(icons.hostOf('http://127.0.0.1:1200/x', 'rss')).toBeNull()
    expect(icons.hostOf('http://rsshub:1200/github/trending', 'rss')).toBeNull()
    expect(icons.hostOf('/github/trending/daily/any', 'rsshub')).toBeNull()
    expect(icons.hostOf('http://example.local/feed', 'rss')).toBeNull()
  })
})

describe('图标抓取', () => {
  it('抓到：存本地一份、发现上回写地址；同域名再来一个源不重复联网', async () => {
    const container = build(imageFetch(PNG))
    const first = seedDiscovery(container, 'A', 'https://example.com/feed.xml')
    const file = await container.icons?.refresh(first, { waitMs: 3000 })

    expect(file).toMatch(/^[a-f0-9]{12}-[a-f0-9]{10}\.png$/)
    expect(readdirSync(iconDir)).toEqual([file])
    expect(container.discoveries.get(first)?.iconUrl).toBe(`/api/icons/${file}`)
    expect(readFileSync(join(iconDir, file as string)).equals(PNG)).toBe(true)

    const callsBefore = calls.length
    const second = seedDiscovery(container, 'B', 'https://example.com/other.xml')
    expect(await container.icons?.refresh(second, { waitMs: 3000 })).toBe(file)
    expect(calls.length).toBe(callsBefore)
  })

  it('对方返回网页不是图片：不存文件、地址回落 null', async () => {
    const container = build(imageFetch(HTML))
    const id = seedDiscovery(container, 'C', 'https://example.com/feed.xml')
    expect(await container.icons?.refresh(id, { waitMs: 3000 })).toBeNull()
    expect(readdirSync(iconDir)).toEqual([])
    expect(container.discoveries.get(id)?.iconUrl).toBeNull()
  })

  it('内网地址与 RSSHub 相对路由：不联网，也不报错', async () => {
    const container = build(imageFetch(PNG))
    const id = seedDiscovery(container, 'D', 'http://127.0.0.1:1200/feed')
    expect(await container.icons?.refresh(id, { waitMs: 3000 })).toBeNull()
    expect(calls).toEqual([])
  })
})

describe('RSSHub 相对路由：先反查源站域名，再抓图标', () => {
  function instanceFetch(body: unknown): typeof fetch {
    return (async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push(url)
      if (url.includes('/api/namespace/')) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.startsWith('https://sspai.com/favicon.ico')) {
        return new Response(new Uint8Array(PNG), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      }
      return new Response('nope', { status: 404 })
    }) as typeof fetch
  }

  it('元数据里有源站：反查成功并存下图标、回写地址', async () => {
    const container = build(
      instanceFetch({ routes: { '/matrix': { radar: [{ source: ['sspai.com/matrix'] }] } } }),
    )
    const id = seedDiscovery(container, 'RSSHub 源', '/sspai/matrix', 'rsshub')

    const file = await container.icons?.refresh(id, { waitMs: 3000 })
    expect(file).toMatch(/^[a-f0-9]{12}-[a-f0-9]{10}\.png$/)
    expect(container.discoveries.get(id)?.iconUrl).toBe(`/api/icons/${file}`)
    expect(calls[0]).toContain('/api/namespace/sspai')
    expect(calls.some((url) => url.startsWith('https://sspai.com/'))).toBe(true)
  })

  it('路由没登记源站：只查元数据，不去抓图，地址留空', async () => {
    const container = build(instanceFetch({ routes: { '/plain': { radar: [] } } }))
    const id = seedDiscovery(container, '没源站', '/sspai/plain', 'rsshub')

    expect(await container.icons?.refresh(id, { waitMs: 3000 })).toBeNull()
    expect(container.discoveries.get(id)?.iconUrl).toBeNull()
    expect(calls.every((url) => url.includes('/api/namespace/'))).toBe(true)
  })
})

describe('保存发现时顺手抓图标（走接口）', () => {
  it('新增发现：响应里就带图标地址，读图接口能取到同一张图', async () => {
    const { buildApp } = await import('../src/app.ts')
    const { createTempDb: tempDb } = await import('./helpers/temp-db.ts')
    const db = tempDb()
    const app = await buildApp({
      dbPath: db.path,
      logger: false,
      enableScheduler: false,
      fetchImpl: imageFetch(PNG),
    })
    try {
      const group = await app.inject({
        method: 'POST',
        url: '/api/groups',
        payload: { name: '分组', description: '', enabled: true },
      })
      const created = await app.inject({
        method: 'POST',
        url: '/api/discoveries',
        payload: {
          groupId: group.json().id,
          name: 'A',
          kind: 'rss',
          target: 'https://example.com/feed.xml',
          cronExpression: '0 * * * *',
          enabled: true,
        },
      })
      expect(created.statusCode).toBe(201)
      const iconUrl = created.json().iconUrl as string
      expect(iconUrl).toMatch(/^\/api\/icons\/[a-f0-9]{12}-[a-f0-9]{10}\.png$/)

      const image = await app.inject({ method: 'GET', url: iconUrl })
      expect(image.statusCode).toBe(200)
      expect(image.rawPayload.equals(PNG)).toBe(true)

      // 手动重新抓一次也走同一条路
      const refreshed = await app.inject({
        method: 'POST',
        url: `/api/discoveries/${created.json().id}/icon`,
      })
      expect(refreshed.statusCode).toBe(200)
      expect(refreshed.json().iconUrl).toBe(iconUrl)
    } finally {
      await app.close()
      db.cleanup()
    }
  })

  it('之前没抓到图标的源：改个名字保存一下会补抓一次，返回里就带图标地址', async () => {
    const { buildApp } = await import('../src/app.ts')
    const { createTempDb: tempDb } = await import('./helpers/temp-db.ts')
    const db = tempDb()
    let allowImage = false
    const flaky = (async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push(url)
      if (!allowImage) return new Response('nope', { status: 404 })
      return new Response(new Uint8Array(PNG), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    }) as typeof fetch

    const app = await buildApp({
      dbPath: db.path,
      logger: false,
      enableScheduler: false,
      fetchImpl: flaky,
    })
    try {
      const group = (
        await app.inject({
          method: 'POST',
          url: '/api/groups',
          payload: { name: '分组', description: '', enabled: true },
        })
      ).json()
      const created = (
        await app.inject({
          method: 'POST',
          url: '/api/discoveries',
          payload: {
            groupId: group.id,
            name: '老源',
            kind: 'rss',
            target: 'https://example.com/feed.xml',
            cronExpression: '0 * * * *',
            enabled: true,
          },
        })
      ).json()
      expect(created.iconUrl).toBeNull()

      allowImage = true
      const saved = await app.inject({
        method: 'PATCH',
        url: `/api/discoveries/${created.id}`,
        payload: { name: '老源改名' },
      })
      expect(saved.statusCode).toBe(200)
      expect(saved.json().iconUrl).toMatch(/^\/api\/icons\/[a-f0-9]{12}-[a-f0-9]{10}\.png$/)
    } finally {
      await app.close()
      db.cleanup()
    }
  })
})

describe('读图接口', () => {
  it('存过的图能读出来，带长期缓存头', async () => {
    const app = Fastify({ logger: false })
    registerIconRoutes(app, iconDir)
    const file = 'aaaaaaaaaaaa-bbbbbbbbbb.png'
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(iconDir, file), PNG)

    const ok = await app.inject({ method: 'GET', url: `/icons/${file}` })
    expect(ok.statusCode).toBe(200)
    expect(ok.headers['content-type']).toBe('image/png')
    expect(ok.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(ok.rawPayload.equals(PNG)).toBe(true)

    const missing = await app.inject({ method: 'GET', url: '/icons/aaaaaaaaaaaa-cccccccccc.png' })
    expect(missing.statusCode).toBe(404)

    const traversal = await app.inject({ method: 'GET', url: '/icons/..%2F..%2Fetc%2Fpasswd' })
    expect(traversal.statusCode).toBe(404)

    await app.close()
  })
})
