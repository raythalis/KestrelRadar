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
})
