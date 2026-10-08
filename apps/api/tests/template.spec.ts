import { describe, expect, it } from 'vitest'

import type { Event, EventMember } from '../src/modules/events/event.repo.ts'
import { renderTemplate } from '../src/modules/delivery/template.ts'
import { defaultTemplateContent } from '../src/modules/templates/builtin.ts'

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    groupId: 'g1',
    title: '某公司发布新模型',
    url: 'https://news.example.com/1',
    urlKey: 'https://news.example.com/1',
    firstItemAt: '2026-10-01T02:00:00.000Z',
    lastItemAt: '2026-10-01T02:00:00.000Z',
    sourceCount: 2,
    itemCount: 2,
    status: 'new',
    deliveredAt: null,
    createdAt: '2026-10-01T02:00:00.000Z',
    updatedAt: '2026-10-01T02:00:00.000Z',
    ...overrides,
  }
}

function member(overrides: Partial<EventMember> = {}): EventMember {
  return {
    itemId: 'i1',
    discoveryId: 'd1',
    discoveryName: '源A',
    title: '某公司发布新模型',
    url: 'https://a.example.com/1',
    summary: '一句话摘要。',
    addedAt: '2026-10-01T02:00:00.000Z',
    ...overrides,
  }
}

function render(template: string, overrides: Record<string, unknown> = {}): string {
  return renderTemplate(template, {
    groupName: 'AI 圈',
    event: event(),
    members: [member()],
    eventCount: 1,
    language: 'zh',
    timezone: 'Asia/Shanghai',
    ...overrides,
  } as never)
}

describe('默认模板', () => {
  it('默认模板带上标题、摘要、来源数、来源列表、链接与命中时间', () => {
    const text = render(defaultTemplateContent())
    expect(text).toContain('【AI 圈】某公司发布新模型')
    expect(text).toContain('一句话摘要。')
    expect(text).toContain('来源 2 个：')
    expect(text).toContain('- 源A：https://a.example.com/1')
    expect(text).toContain('命中时间：2026-10-01 10:00')
  })

  it('只有一套模板；语言只影响标记与来源分隔符这类固定文案', () => {
    const text = render(defaultTemplateContent(), {
      language: 'en',
      event: event({ status: 'updated' }),
    })
    // 正文还是模板里写的那套，只有「有更新」标记与来源分隔符跟着语言
    expect(text).toContain('Update 【AI 圈】某公司发布新模型')
    expect(text).toContain('- 源A: https://a.example.com/1')
    expect(text).toContain('来源 2 个：')
  })

  it('更新过的事件带「有更新」标记，来源行用中文分隔符', () => {
    const text = render(defaultTemplateContent(), { event: event({ status: 'updated' }) })
    expect(text).toContain('有更新 【AI 圈】某公司发布新模型')
    expect(text).toContain('- 源A：https://a.example.com/1')
  })

  it('命中时间按设置里的时区渲染', () => {
    expect(render('{{hitAt}}', { timezone: 'Asia/Shanghai' })).toBe('2026-10-01 10:00')
    expect(render('{{hitAt}}', { timezone: 'UTC' })).toBe('2026-10-01 02:00')
  })

  it('多个来源逐行列出', () => {
    const text = render('{{sources}}', {
      members: [
        member({ discoveryName: '源A' }),
        member({ discoveryId: 'd2', discoveryName: '源B', url: 'https://b.example.com/2' }),
      ],
    })
    expect(text.split('\n')).toHaveLength(2)
    expect(text).toContain('- 源B：https://b.example.com/2')
  })
})

describe('有更新标记与自定义模板', () => {
  it('新事件不带标记，标成有更新时带「有更新」', () => {
    expect(render('{{badge}}{{title}}')).toBe('某公司发布新模型')
    expect(render('{{badge}}{{title}}', { event: event({ status: 'updated' }) })).toBe(
      '有更新 某公司发布新模型',
    )
  })

  it('认不得的变量原样留着，方便看出写错了哪个', () => {
    expect(render('{{title}} {{whoops}}')).toBe('某公司发布新模型 {{whoops}}')
  })

  it('摘要太长会截断到 120 字', () => {
    const long = '很长的正文。'.repeat(60)
    const text = render('{{summary}}', { members: [member({ summary: long })] })
    expect(text.endsWith('…')).toBe(true)
    expect(text.length).toBeLessThanOrEqual(121)
  })

  it('没有链接的来源有兜底文案', () => {
    const text = render('{{sources}}', { members: [member({ url: null })] })
    expect(text).toContain('（没有链接）')
  })

  it('自定义模板里能用事件数变量', () => {
    expect(render('这轮共 {{eventCount}} 条', { eventCount: 3 })).toBe('这轮共 3 条')
  })
})
