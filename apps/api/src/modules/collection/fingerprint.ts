import { createHash } from 'node:crypto'

/** 链接里这些参数只是追踪用的，去掉之后同一条内容才算同一条 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'yclid',
  'msclkid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'spm',
  'from',
  'ref',
  'ref_src',
  'share_token',
  'share_source',
  'weibo_id',
  '_hsenc',
  '_hsmi',
])

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 归一化链接：去追踪参数、统一大小写、去掉末尾斜杠与锚点、参数排序 */
function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    const tracking: string[] = []
    for (const key of url.searchParams.keys()) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) tracking.push(key)
    }
    for (const key of tracking) url.searchParams.delete(key)
    url.searchParams.sort()
    const params = url.searchParams.toString()
    const path = url.pathname.replace(/\/+$/, '')
    return `${url.protocol}//${url.hostname}${path}${params ? `?${params}` : ''}`.toLowerCase()
  } catch {
    return null
  }
}

/**
 * 内容指纹：优先用归一化链接；没有链接就退回「标题 + 正文片段」。
 * 只用于判断「这条内容我是不是见过」，不掺时间——时间只影响排序与投递。
 */
export function buildFingerprint(input: {
  url?: string | null
  title: string
  summary?: string
}): string {
  const normalizedUrl = input.url ? normalizeUrl(input.url) : null
  const key = normalizedUrl
    ? `url:${normalizedUrl}`
    : `text:${normalizeText(input.title)}|${normalizeText(input.summary ?? '').slice(0, 200)}`
  return createHash('sha256').update(key).digest('hex')
}
