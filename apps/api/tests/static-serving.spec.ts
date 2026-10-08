import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, normalize } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.ts'
import { loadConfig } from '../src/config/index.ts'
import { createTempDb } from './helpers/temp-db.ts'

const dirs: string[] = []

/** 造一份「构建产物」：首页 + 一个资源文件 */
function makeDist(indexHtml = '<!doctype html><title>Kestrel Radar</title>'): string {
  const dir = mkdtempSync(join(tmpdir(), 'kestrel-dist-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'index.html'), indexHtml)
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)')
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function withApp(staticDir?: string) {
  const db = createTempDb()
  const app = await buildApp({
    dbPath: db.path,
    logger: false,
    ...(staticDir ? { staticDir } : {}),
  })
  return {
    app,
    cleanup: async () => {
      await app.close()
      db.cleanup()
    },
  }
}

describe('静态托管（生产形态：一个进程同时提供界面与 API）', () => {
  it('给了构建产物就托管：首页、前端路由回落、资源文件，API 一点不动', async () => {
    const { app, cleanup } = await withApp(makeDist())
    try {
      const home = await app.inject({ method: 'GET', url: '/' })
      expect(home.statusCode).toBe(200)
      expect(home.body).toContain('<title>Kestrel Radar</title>')

      // 前端自己的路由（没有扩展名）刷新时不能吃到 404
      const page = await app.inject({ method: 'GET', url: '/config' })
      expect(page.statusCode).toBe(200)
      expect(page.body).toContain('<title>Kestrel Radar</title>')

      const asset = await app.inject({ method: 'GET', url: '/assets/app.js' })
      expect(asset.statusCode).toBe(200)
      expect(asset.body).toContain('console.log')

      // 少一个资源文件就是少一个，不拿首页糊弄
      const missingAsset = await app.inject({ method: 'GET', url: '/assets/nope.js' })
      expect(missingAsset.statusCode).toBe(404)

      // API 的错误出口一点没变
      const api404 = await app.inject({ method: 'GET', url: '/api/nope' })
      expect(api404.statusCode).toBe(404)
      expect(api404.json()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })

      // 真的接口照常工作
      const config = await app.inject({ method: 'GET', url: '/api/config' })
      expect(config.statusCode).toBe(200)
      expect(config.json().settings).toBeTruthy()
    } finally {
      await cleanup()
    }
  })

  it('没给构建产物就只提供 API，页面路径仍然按 404 处理', async () => {
    const { app, cleanup } = await withApp()
    try {
      const home = await app.inject({ method: 'GET', url: '/' })
      expect(home.statusCode).toBe(404)
      expect(home.json()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    } finally {
      await cleanup()
    }
  })

  it('目录不存在时降级成只提供 API，不崩', async () => {
    const { app, cleanup } = await withApp(join(tmpdir(), 'kestrel-not-there'))
    try {
      const home = await app.inject({ method: 'GET', url: '/' })
      expect(home.statusCode).toBe(404)
      const health = await app.inject({ method: 'GET', url: '/api/health' })
      expect(health.statusCode).toBe(200)
    } finally {
      await cleanup()
    }
  })
})

describe('启动配置', () => {
  it('KESTREL_STATIC_DIR 显式给定时用它', () => {
    const config = loadConfig({ KESTREL_STATIC_DIR: '/tmp/somewhere' })
    expect(config.staticDir).toBe('/tmp/somewhere')
  })

  it('没给时看构建产物在不在，端口与库路径沿用默认', () => {
    const config = loadConfig({})
    expect(config.port).toBe(8765)
    expect(config.dbPath).toBe('data/kestrel.db')
    expect(
      config.staticDir === undefined ||
        normalize(config.staticDir).endsWith(join('apps', 'web', 'dist')),
    ).toBe(true)
  })
})
