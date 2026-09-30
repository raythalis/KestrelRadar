import { describe, expect, it } from 'vitest'

import { parseFeed } from '../src/modules/collection/feed-parser.ts'
import { ATOM_ONE_ITEM, PAGE_WITHOUT_FEED, RSS_TWO_ITEMS } from './helpers/feed-fixtures.ts'

describe('feed 解析', () => {
  it('RSS 2.0：取标题、链接、摘要与发布时间', () => {
    const entries = parseFeed(RSS_TWO_ITEMS)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      title: '第一篇文章',
      url: 'https://example.com/post/1?utm_source=rss&utm_medium=feed',
      publishedAt: '2026-09-30T12:00:00.000Z',
    })
    expect(entries[0]?.summary).toContain('第一篇的摘要内容')
  })

  it('没有发布时间的条目，发布时间留空（不拿抓取时间顶上）', () => {
    const entries = parseFeed(RSS_TWO_ITEMS)
    expect(entries[1]?.publishedAt).toBeNull()
  })

  it('Atom：从 link href 取链接', () => {
    const entries = parseFeed(ATOM_ONE_ITEM)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ title: 'Atom 里的一篇', url: 'https://example.com/atom/1' })
  })

  it('不是 feed 的内容直接报错，不当成空源', () => {
    expect(() => parseFeed(PAGE_WITHOUT_FEED)).toThrow()
  })
})
