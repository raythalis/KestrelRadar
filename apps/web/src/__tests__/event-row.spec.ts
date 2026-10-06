import type { RecentEvent } from '@kestrel/contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventRow from '@/components/biz/EventRow.vue'
import vuetify from '@/plugins/vuetify'

function event(overrides: Partial<RecentEvent> = {}): RecentEvent {
  return {
    id: 'e1',
    title: 'Vue 3.6 正式版发布',
    url: 'https://example.com/a',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rsshub',
    sources: [{ discoveryId: 'd1', name: '少数派', url: 'https://example.com/a' }],
    sourceCount: 1,
    sourceNames: ['少数派'],
    itemCount: 1,
    firstItemAt: '2026-10-07T08:00:00.000Z',
    lastItemAt: '2026-10-07T11:00:00.000Z',
    readAt: null,
    ...overrides,
  }
}

function render(props: { event: RecentEvent; time?: string }) {
  return mount(EventRow, { props, global: { plugins: [vuetify] } })
}

describe('EventRow', () => {
  it('没看过的事件挂实心圆点，看过的不挂', () => {
    expect(render({ event: event() }).find('[data-test="event-unread"]').exists()).toBe(true)
    expect(
      render({ event: event({ readAt: '2026-10-07T11:30:00.000Z' }) })
        .find('[data-test="event-unread"]')
        .exists(),
    ).toBe(false)
  })

  it('标题、时间、来源标签都在一行里', () => {
    const wrapper = render({ event: event(), time: '20 分钟前' })
    expect(wrapper.text()).toContain('Vue 3.6 正式版发布')
    expect(wrapper.find('[data-test="event-time"]').text()).toBe('20 分钟前')
    expect(wrapper.find('[data-test="app-source-tags"]').text()).toContain('少数派')
  })

  it('有原文就渲染成可点的链接，没有就退化成普通块', () => {
    const linked = render({ event: event() })
    expect(linked.element.tagName).toBe('A')
    expect(linked.attributes('href')).toBe('https://example.com/a')
    expect(linked.find('.k2-list__chevron').exists()).toBe(true)

    const plain = render({ event: event({ url: null }) })
    expect(plain.element.tagName).toBe('ARTICLE')
    expect(plain.find('.k2-list__chevron').exists()).toBe(false)
  })

  it('点开一行会把事件抛给页面（页面负责记已读）', async () => {
    const wrapper = render({ event: event() })
    await wrapper.trigger('click')
    const emitted = wrapper.emitted('open')
    expect(emitted).toHaveLength(1)
    expect((emitted?.[0]?.[0] as RecentEvent).id).toBe('e1')
  })
})
