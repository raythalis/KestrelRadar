import { describe, expect, it } from 'vitest'

import {
  createChannelInputSchema,
  createGroupInputSchema,
  createMonitorInputSchema,
  isHttpUrl,
  isValidCronExpression,
  isValidDiscoveryTarget,
  optionalCronSchema,
} from '@kestrel/contracts'

describe('cron 语法（前后端同一份）', () => {
  it('认常规 5 段写法', () => {
    const ok = [
      '* * * * *',
      '0 8 * * *',
      '30 9 * * 1-5',
      '*/5 8 * * *',
      '0 */6 * * *',
      '0 6 1,15 * *',
      '0 8 1-5/2 * *',
    ]
    for (const expression of ok) expect(isValidCronExpression(expression)).toBe(true)
  })

  it('段数不对、别名、越界都拒', () => {
    const bad = [
      '',
      '   ',
      '0 8 * *',
      '* * * * * *',
      '@daily',
      '99 99 * * *',
      '0 24 * * *',
      '0 8 32 * *',
      '0 8 * 13 *',
      '0 8 * * 9',
      'MON 8 * * *',
      '0 8-2 * * *',
      '0 8 * * * *',
    ]
    for (const expression of bad) expect(isValidCronExpression(expression)).toBe(false)
  })

  it('动作的汇总时间可空；填了就得合法', () => {
    const schema = optionalCronSchema()
    expect(schema.safeParse(null).success).toBe(true)
    expect(schema.safeParse('').success).toBe(true)
    expect(schema.safeParse('   ').success).toBe(true)
    expect(schema.safeParse('0 9 * * *').success).toBe(true)
    expect(schema.safeParse('@daily').success).toBe(false)
  })
})

describe('发现目标的形状', () => {
  it('rss / web 必须是 http(s) 地址', () => {
    expect(isValidDiscoveryTarget('https://example.com/feed.xml', 'rss')).toBe(true)
    expect(isValidDiscoveryTarget('http://example.com', 'web')).toBe(true)
    expect(isValidDiscoveryTarget('example.com/feed.xml', 'rss')).toBe(false)
    expect(isValidDiscoveryTarget('ftp://example.com/feed', 'web')).toBe(false)
  })

  it('rsshub 还认相对路由', () => {
    expect(isValidDiscoveryTarget('/sspai/matrix', 'rsshub')).toBe(true)
    expect(isValidDiscoveryTarget('bilibili/ranking/all', 'rsshub')).toBe(true)
    expect(isValidDiscoveryTarget('https://rsshub.app/sspai/matrix', 'rsshub')).toBe(true)
    expect(isValidDiscoveryTarget('/sspai/matrix', 'rss')).toBe(false)
  })

  it('带空格一律拒', () => {
    expect(isValidDiscoveryTarget('https://example.com/a b', 'web')).toBe(false)
    expect(isValidDiscoveryTarget('/sspai/ matrix', 'rsshub')).toBe(false)
    expect(isValidDiscoveryTarget('   ', 'rsshub')).toBe(false)
  })

  it('isHttpUrl 只认 http / https', () => {
    expect(isHttpUrl('HTTP://example.com')).toBe(true)
    expect(isHttpUrl(' https://example.com ')).toBe(true)
    expect(isHttpUrl('example.com')).toBe(false)
    expect(isHttpUrl('ws://example.com')).toBe(false)
  })
})

describe('名称类：trim 与空白拒绝', () => {
  it('两边的空格会被去掉', () => {
    expect(createGroupInputSchema.parse({ name: '  分组  ' }).name).toBe('分组')
  })

  it('只有空格的名字过不去', () => {
    expect(createGroupInputSchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(createMonitorInputSchema.safeParse({ groupId: 'g', name: '\t ' }).success).toBe(false)
  })
})

describe('长度与个数上限', () => {
  it('标签：单项最多 100 字、最多 200 个', () => {
    const long = 'x'.repeat(101)
    expect(
      createMonitorInputSchema.safeParse({ groupId: 'g', name: 'M', includeKeywords: [long] })
        .success,
    ).toBe(false)
    expect(
      createMonitorInputSchema.safeParse({
        groupId: 'g',
        name: 'M',
        includeKeywords: Array.from({ length: 200 }, (_, index) => `k${index}`),
      }).success,
    ).toBe(true)
    expect(
      createMonitorInputSchema.safeParse({
        groupId: 'g',
        name: 'M',
        excludeKeywords: Array.from({ length: 201 }, (_, index) => `k${index}`),
      }).success,
    ).toBe(false)
  })

  it('绑定的动作最多 50 个', () => {
    const ids = Array.from({ length: 51 }, (_, index) => `a${index}`)
    expect(
      createMonitorInputSchema.safeParse({ groupId: 'g', name: 'M', actionIds: ids.slice(0, 50) })
        .success,
    ).toBe(true)
    expect(
      createMonitorInputSchema.safeParse({ groupId: 'g', name: 'M', actionIds: ids }).success,
    ).toBe(false)
  })

  it('渠道 config：只给 url 与 chatId 设上限，别的键不动', () => {
    expect(
      createChannelInputSchema.safeParse({
        name: 'C',
        type: 'webhook',
        config: { url: `https://a.example/${'x'.repeat(500)}` },
      }).success,
    ).toBe(false)
    expect(
      createChannelInputSchema.safeParse({
        name: 'C',
        type: 'telegram',
        config: { chatId: 'x'.repeat(121) },
      }).success,
    ).toBe(false)
    expect(
      createChannelInputSchema.safeParse({
        name: 'C',
        type: 'webhook',
        config: { note: 'x'.repeat(5000) },
      }).success,
    ).toBe(true)
  })

  it('config 里的值会被 trim', () => {
    const parsed = createChannelInputSchema.parse({
      name: 'C',
      type: 'webhook',
      config: { url: ' https://a.example/hook ' },
    })
    expect(parsed.config.url).toBe('https://a.example/hook')
  })
})
