import { describe, expect, it } from 'vitest'

import {
  createRsshubRoutes,
  hostFromSource,
  matchingRoutes,
} from '../src/modules/config/rsshub-routes.ts'

type SettingsStub = { rsshubBaseUrl: string; rsshubAccessKey: string }

function settings(patch: Partial<SettingsStub> = {}) {
  const value: SettingsStub = {
    rsshubBaseUrl: 'http://localhost:1200',
    rsshubAccessKey: '',
    ...patch,
  }
  return { get: () => value } as never
}

/** 假的实例：只认 /api/namespace/<ns>，回一份路由表 */
function metadataFetch(routes: Record<string, unknown> | null, calls: string[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    if (routes === null) return new Response('nope', { status: 404 })
    return new Response(JSON.stringify({ routes }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

describe('源站域名与路由匹配', () => {
  it('source 里的域名：带路径、带协议、大写都能取出来', () => {
    expect(hostFromSource('sspai.com/matrix')).toBe('sspai.com')
    expect(hostFromSource('https://News.YCombinator.com/rss')).toBe('news.ycombinator.com')
    expect(hostFromSource('  example.com  ')).toBe('example.com')
    expect(hostFromSource('')).toBeNull()
  })

  it('具体目标匹配路由键：原样命中优先，:参数 通配，:参数? 可缺', () => {
    const routes = {
      '/matrix': {},
      '/activity/:slug': {},
      '/series/:id/comments': {},
      '/trending/:since/:language/:spoken_language?': {},
    }
    expect(matchingRoutes(routes, '/matrix')[0]).toBe('/matrix')
    expect(matchingRoutes(routes, '/activity/urfp0d9i')).toEqual(['/activity/:slug'])
    expect(matchingRoutes(routes, '/series/123/comments')).toEqual(['/series/:id/comments'])
    expect(matchingRoutes(routes, '/trending/daily/any')).toEqual([
      '/trending/:since/:language/:spoken_language?',
    ])
    expect(matchingRoutes(routes, '/nope/x')).toEqual([])
  })
})

describe('RSSHub 相对路由反查源站', () => {
  it('/sspai/matrix → 元数据里的 sspai.com；同名实例只查一次', async () => {
    const calls: string[] = []
    const routes = createRsshubRoutes({
      settings: settings(),
      fetchImpl: metadataFetch({ '/matrix': { radar: [{ source: ['sspai.com/matrix'] }] } }, calls),
    })

    expect(await routes.resolveHost('/sspai/matrix')).toBe('sspai.com')
    expect(await routes.resolveHost('sspai/matrix')).toBe('sspai.com')
    expect(calls).toEqual(['http://localhost:1200/api/namespace/sspai'])
  })

  it('带访问密钥的实例：请求里带上 key', async () => {
    const calls: string[] = []
    const routes = createRsshubRoutes({
      settings: settings({ rsshubAccessKey: 'abc123' }),
      fetchImpl: metadataFetch({ '/matrix': { radar: [{ source: ['sspai.com/matrix'] }] } }, calls),
    })
    await routes.resolveHost('/sspai/matrix')
    expect(calls[0]).toBe('http://localhost:1200/api/namespace/sspai?key=abc123')
  })

  it('路由不认识 / 元数据里没源站 / 实例没有地址：都返回 null', async () => {
    const unknown = createRsshubRoutes({
      settings: settings(),
      fetchImpl: metadataFetch({ '/matrix': { radar: [{ source: ['sspai.com/matrix'] }] } }, []),
    })
    expect(await unknown.resolveHost('/sspai/not-a-route')).toBeNull()

    const noSource = createRsshubRoutes({
      settings: settings(),
      fetchImpl: metadataFetch({ '/plain': {} }, []),
    })
    expect(await noSource.resolveHost('/demo/plain')).toBeNull()

    const noBase = createRsshubRoutes({
      settings: settings({ rsshubBaseUrl: '' }),
      fetchImpl: metadataFetch({ '/matrix': { radar: [{ source: ['sspai.com/matrix'] }] } }, []),
    })
    expect(await noBase.resolveHost('/sspai/matrix')).toBeNull()
  })

  it('实例连不上：不抛错，安静地返回 null', async () => {
    const routes = createRsshubRoutes({
      settings: settings(),
      fetchImpl: metadataFetch(null, []),
    })
    expect(await routes.resolveHost('/sspai/matrix')).toBeNull()
  })
})
