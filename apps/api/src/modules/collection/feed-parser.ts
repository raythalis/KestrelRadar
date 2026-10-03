import { XMLParser } from 'fast-xml-parser'

export interface ParsedEntry {
  title: string
  url: string | null
  summary: string
  publishedAt: string | null
}

/**
 * 解析失败分两种：空源（拿到了 feed，但里面一条都没有）与不是订阅源。
 * 前者不算失败（只记流水），后者要开异常，所以要用码区分，别靠文案猜。
 */
export type FeedParseFailureKind = 'empty' | 'not_feed'

export class FeedParseError extends Error {
  readonly kind: FeedParseFailureKind

  constructor(kind: FeedParseFailureKind, message: string) {
    super(message)
    this.name = 'FeedParseError'
    this.kind = kind
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false,
})

function firstOf(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function textOf(value: unknown): string {
  const item = firstOf(value)
  if (item === null || item === undefined) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    const record = item as Record<string, unknown>
    if (typeof record['#text'] === 'string') return record['#text']
    if (typeof record['@_href'] === 'string') return record['@_href']
  }
  return ''
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function toIsoOrNull(value: unknown): string | null {
  const raw = textOf(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function atomLink(entry: Record<string, unknown>): string | null {
  const links =
    entry['link'] === undefined
      ? []
      : Array.isArray(entry['link'])
        ? entry['link']
        : [entry['link']]
  const alternate = links.find((link) => {
    const rel = (link as Record<string, unknown>)?.['@_rel']
    return rel === undefined || rel === 'alternate'
  })
  const href = (alternate as Record<string, unknown> | undefined)?.['@_href'] ?? alternate
  return typeof href === 'string' && href ? href : null
}

/**
 * 解析 RSS 2.0 / Atom。
 * 拿不到发布时间就留空——绝不把抓取时间当发布时间，否则榜单类源每次刷新都会像刚发生。
 */
export function parseFeed(xml: string): ParsedEntry[] {
  if (!xml.includes('<')) throw new FeedParseError('not_feed', '返回的内容不是 feed 格式')

  let document: Record<string, unknown>
  try {
    document = parser.parse(xml) as Record<string, unknown>
  } catch {
    throw new FeedParseError('not_feed', '返回的内容解析不了，可能不是订阅源')
  }

  const rssChannel = (document['rss'] as Record<string, unknown> | undefined)?.['channel'] as
    Record<string, unknown> | undefined
  const feed = document['feed'] as Record<string, unknown> | undefined
  const rdf = (document['rdf'] ?? document['RDF']) as Record<string, unknown> | undefined

  const rawEntries: unknown[] = []
  if (rssChannel?.['item']) {
    rawEntries.push(
      ...(Array.isArray(rssChannel['item']) ? rssChannel['item'] : [rssChannel['item']]),
    )
  } else if (feed?.['entry']) {
    rawEntries.push(...(Array.isArray(feed['entry']) ? feed['entry'] : [feed['entry']]))
  } else if (rdf?.['item']) {
    const items = rdf['item']
    rawEntries.push(...(Array.isArray(items) ? items : [items]))
  }

  if (rawEntries.length === 0) {
    // 长得像订阅源（有 rss / feed / rdf 根）但一条都没有 → 空源；否则根本不是订阅源
    const looksLikeFeed = Boolean(rssChannel || feed || rdf)
    throw looksLikeFeed
      ? new FeedParseError('empty', '返回的内容里没有订阅源条目')
      : new FeedParseError('not_feed', '返回的内容不是订阅源')
  }

  return rawEntries
    .filter(
      (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
    )
    .map((entry) => {
      const isAtom =
        entry['updated'] !== undefined ||
        entry['published'] !== undefined ||
        entry['summary'] !== undefined
      const url = isAtom ? atomLink(entry) : textOf(entry['link']) || null
      const summarySource = entry['description'] ?? entry['summary'] ?? entry['content'] ?? ''
      return {
        title: stripHtml(textOf(entry['title'])) || '(无标题)',
        url: url ? url.trim() : null,
        summary: stripHtml(textOf(summarySource)).slice(0, 300),
        publishedAt: toIsoOrNull(
          entry['pubDate'] ?? entry['published'] ?? entry['updated'] ?? entry['dc:date'],
        ),
      }
    })
}
