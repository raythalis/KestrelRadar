import { describe, expect, it } from 'vitest'

import { buildFingerprint } from '../src/modules/collection/fingerprint.ts'

describe('指纹', () => {
  it('同一条内容带不同追踪参数，指纹相同', () => {
    const plain = buildFingerprint({ url: 'https://example.com/post/1', title: '标题' })
    const tracked = buildFingerprint({
      url: 'https://example.com/post/1?utm_source=rss&utm_medium=feed&fbclid=abc',
      title: '标题',
    })
    expect(tracked).toBe(plain)
  })

  it('大小写、末尾斜杠、锚点归一', () => {
    const a = buildFingerprint({ url: 'https://Example.com/Post/1/#section', title: '标题' })
    const b = buildFingerprint({ url: 'https://example.com/post/1', title: '标题' })
    expect(a).toBe(b)
  })

  it('有意义的查询参数保留，不同内容不会撞指纹', () => {
    const a = buildFingerprint({ url: 'https://example.com/post?id=1', title: '标题' })
    const b = buildFingerprint({ url: 'https://example.com/post?id=2', title: '标题' })
    expect(a).not.toBe(b)
  })

  it('没有链接时用标题加摘要，空白差异不影响', () => {
    const a = buildFingerprint({ url: null, title: '一篇  文章', summary: '摘要内容' })
    const b = buildFingerprint({ url: null, title: '一篇 文章', summary: '摘要内容' })
    const c = buildFingerprint({ url: null, title: '一篇 文章', summary: '另一段内容' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
