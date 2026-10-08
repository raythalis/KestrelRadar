import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppEmptyState from '@/components/app/AppEmptyState.vue'
import vuetify from '@/plugins/vuetify'

function mountEmpty(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AppEmptyState, { props, slots, global: { plugins: [vuetify] } })
}

describe('AppEmptyState', () => {
  it('纯信息型：只有标题和说明', () => {
    const wrapper = mountEmpty({ title: '还没有分组', note: '先建一个' })
    expect(wrapper.get('.k2-empty__title').text()).toBe('还没有分组')
    expect(wrapper.get('.k2-empty__sub').text()).toBe('先建一个')
    expect(wrapper.find('.k2-empty__actions').exists()).toBe(false)
  })

  it('带操作型：actions 插槽里放按钮', () => {
    const wrapper = mountEmpty({ title: '还没有分组' }, { actions: '<button>新建分组</button>' })
    expect(wrapper.get('.k2-empty__actions').text()).toContain('新建分组')
  })

  it('可以带图标', () => {
    expect(mountEmpty({ icon: 'mdi-inbox-outline' }).find('.k2-empty__icon').exists()).toBe(true)
    expect(mountEmpty({ title: 'x' }).find('.k2-empty__icon').exists()).toBe(false)
  })

  it('art：活跃区那两张插图，事件一张、异常一张', () => {
    const events = mountEmpty({ art: 'events' })
    expect(events.find('.k2-empty-art--events').exists()).toBe(true)
    expect(events.find('.k2-empty-art__ring').exists()).toBe(true)
    expect(events.find('.k2-empty-art__icon .mdi-inbox-outline').exists()).toBe(true)
    // 有插图时不再渲染单图标，避免两个图标同时出现
    expect(events.find('.k2-empty__icon').exists()).toBe(false)

    const incidents = mountEmpty({ art: 'incidents' })
    expect(incidents.find('.k2-empty-art--incidents').exists()).toBe(true)
    expect(incidents.find('.k2-empty-art__icon .mdi-check-circle-outline').exists()).toBe(true)
  })
})
