import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { isIP } from 'node:net'
import { join } from 'node:path'

import type { DiscoveryKind } from '@kestrel/contracts'

import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'

export interface IconServiceDeps {
  discoveries: DiscoveryRepo
  /** 图标存哪：与数据库同级目录下的 icons/ */
  dir: string
  fetchImpl?: typeof fetch
  /** 单次抓取超时（毫秒）：前台最多等 waitMs，后台这次请求自己也别吊太久 */
  timeoutMs?: number
  /** 单张图标大小上限（字节） */
  maxBytes?: number
}

const DEFAULT_TIMEOUT_MS = 6000
const DEFAULT_MAX_BYTES = 100 * 1024
const INTERNAL_SUFFIXES = [
  '.local',
  '.internal',
  '.localhost',
  '.lan',
  '.home',
  '.test',
  '.invalid',
]
const CANDIDATES = ['/favicon.ico', '/apple-touch-icon.png']
/** 先试 https，站点只有 http 时再退一步（都在后台跑，不挡保存） */
const PROTOCOLS = ['https', 'http']

/** 认图片看文件头，不看对方说什么（防软 404 返回一坨 HTML） */
function imageExt(buffer: Buffer): string | null {
  if (buffer.length < 8) return null
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png'
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg'
  if (buffer.subarray(0, 3).equals(Buffer.from('GIF'))) return 'gif'
  if (buffer.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0x00]))) return 'ico'
  if (
    buffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
    buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
  ) {
    return 'webp'
  }
  return null
}

export function contentTypeFor(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

/** 图标文件名：域名哈希 + 内容哈希，换图自动失效，可以长期缓存 */
const FILE_PATTERN = /^[a-f0-9]{12}-[a-f0-9]{10}\.(png|jpg|gif|webp|ico)$/

export function isValidIconFile(file: string): boolean {
  return FILE_PATTERN.test(file)
}

export function iconFileExtension(file: string): string {
  return file.slice(file.lastIndexOf('.') + 1)
}

export function createIconService(deps: IconServiceDeps) {
  const doFetch = deps.fetchImpl ?? fetch
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_BYTES

  /** 从发现的目标里取出域名；RSSHub 的相对路由取不到域名，返回 null */
  function hostOf(target: string, kind: DiscoveryKind): string | null {
    const trimmed = target.trim()
    if (!trimmed) return null
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const url = new URL(withScheme)
      const host = url.hostname.toLowerCase()
      // 没有点的当内网/主机名，IP 字面量也不抓（抓来多半也没意义）
      if (!host.includes('.') || isIP(host) !== 0) return null
      if (INTERNAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null
      if (kind === 'rsshub' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return null
      return host
    } catch {
      return null
    }
  }

  function hostKey(host: string): string {
    return createHash('sha1').update(host).digest('hex').slice(0, 12)
  }

  async function download(host: string): Promise<{ body: Buffer; ext: string } | null> {
    for (const protocol of PROTOCOLS) {
      for (const path of CANDIDATES) {
        try {
          const response = await doFetch(new URL(path, `${protocol}://${host}`), {
            signal: AbortSignal.timeout(timeoutMs),
            headers: { accept: 'image/*,*/*;q=0.8', 'user-agent': 'Kestrel/1.0 (+favicon)' },
          })
          if (!response.ok) continue
          const body = Buffer.from(await response.arrayBuffer())
          if (body.length === 0 || body.length > maxBytes) continue
          const ext = imageExt(body)
          if (!ext) continue
          return { body, ext }
        } catch {
          continue
        }
      }
    }
    return null
  }

  async function fetchAndStore(id: string, host: string): Promise<string | null> {
    const found = await download(host)
    if (!found) {
      deps.discoveries.setIcon(id, null)
      return null
    }
    const file = `${hostKey(host)}-${createHash('sha1').update(found.body).digest('hex').slice(0, 10)}.${found.ext}`
    try {
      mkdirSync(deps.dir, { recursive: true })
      writeFileSync(join(deps.dir, file), found.body)
    } catch {
      deps.discoveries.setIcon(id, null)
      return null
    }
    deps.discoveries.setIcon(id, file)
    return file
  }

  /**
   * 抓图标并回写到发现上。waitMs 是「最多等多久」：
   * 等不到就先返回 null（界面回落类型图标），后台继续抓，下次打开就有了。
   */
  async function refresh(id: string, options: { waitMs?: number } = {}): Promise<string | null> {
    const discovery = deps.discoveries.get(id)
    if (!discovery) return null
    const host = hostOf(discovery.target, discovery.kind)
    if (!host) {
      deps.discoveries.setIcon(id, null)
      return null
    }
    // 同一个域名抓过就不再拉，直接复用那张图
    const cached = deps.discoveries.findIconForPrefix(hostKey(host))
    if (cached) {
      deps.discoveries.setIcon(id, cached)
      return cached
    }

    const waitMs = options.waitMs ?? 0
    if (waitMs <= 0) {
      void fetchAndStore(id, host).catch(() => null)
      return null
    }
    const pending = fetchAndStore(id, host)
    const timedOut = Symbol('timeout')
    const result = await Promise.race([
      pending,
      new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), waitMs)),
    ])
    if (result === timedOut) {
      void pending.catch(() => null)
      return null
    }
    return result
  }

  return { hostOf, refresh }
}

export type IconService = ReturnType<typeof createIconService>
