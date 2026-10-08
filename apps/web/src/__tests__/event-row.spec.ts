import type { RecentEvent } from '@kestrel/contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventRow from '@/components/biz/EventRow.vue'
import i18n from '@/plugins/i18n'
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
  return mount(EventRow, { props, global: { plugins: [vuetify, i18n] } })
}

describe('EventRow', () => {
  it('圆点两态：没看过＝实心；看过之后又有新条目＝空心圈；否则不挂', () => {
    expect(render({ event: event() }).find('[data-test="event-unread"]').exists()).toBe(true)

    // 读在 11:30，之后（12:40）又来了一条 → 有更新
    const updated = render({ event: event({ readAt: '2026-10-07T11:30:00.000Z' }) })
    // lastItemAt 是 11:00，早于读过的时间 → 只算已读
    expect(updated.find('[data-test="event-unread"]').exists()).toBe(false)
    expect(updated.find('[data-test="event-updated"]').exists()).toBe(false)

    const fresh = render({
      event: event({ readAt: '2026-10-07T10:00:00.000Z', lastItemAt: '2026-10-07T12:40:00.000Z' }),
    })
    expect(fresh.find('[data-test="event-unread"]').exists()).toBe(false)
    expect(fresh.find('[data-test="event-updated"]').exists()).toBe(true)
  })

  it('标题、时间、来源标签都在一行里', () => {
    const wrapper = render({ event: event(), time: '20 分钟前' })
    expect(wrapper.text()).toContain('Vue 3.6 正式版发布')
    expect(wrapper.find('[data-test="event-time"]').text()).toBe('20 分钟前')
    expect(wrapper.find('[data-test="app-source-tags"]').text()).toContain('少数派')
  })

  it('有原文的行是 role=link（不写成 <a>，免得和来源标签嵌套），没原文就退化成普通块', () => {
    // 行里挂着来源标签（那些是真链接），行再做成 <a> 就是嵌套 <a>，点标签会被行的跳转抢走
    const linked = render({ event: event() })
    expect(linked.element.tagName).toBe('DIV')
    expect(linked.attributes('role')).toBe('link')
    expect(linked.attributes('tabindex')).toBe('0')
    expect(linked.find('.k2-list__chevron').exists()).toBe(true)

    const plain = render({ event: event({ url: null }) })
    expect(plain.element.tagName).toBe('ARTICLE')
    expect(plain.attributes('role')).toBeUndefined()
    expect(plain.find('.k2-list__chevron').exists()).toBe(false)
  })

  it('键盘回车也能打开（role=link 得能用键盘）', async () => {
    const wrapper = render({ event: event() })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('点来源标签不会触发行本身的 open', async () => {
    const wrapper = render({ event: event() })
    const tag = wrapper.find(
      '[data-test="app-source-tags"] a, [data-test="app-source-tags"] .k2-chip',
    )
    expect(tag.exists()).toBe(true)
    await tag.trigger('click')
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('点开一行会把事件抛给页面（页面负责记已读）', async () => {
    const wrapper = render({ event: event() })
    await wrapper.trigger('click')
    const emitted = wrapper.emitted('open')
    expect(emitted).toHaveLength(1)
    const emittedEvent = emitted?.[0]?.[0]
    expect(emittedEvent).toBeDefined()
    expect((emittedEvent as RecentEvent).id).toBe('e1')
  })
})
