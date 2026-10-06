import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppTabs from '@/components/app/AppTabs.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

const items = [
  { value: 'discoveries', label: '发现', count: 3 },
  { value: 'monitors', label: '监听', count: 0 },
  { value: 'actions', label: '动作' },
]

function mountTabs(value = 'discoveries') {
  return mount(AppTabs, {
    props: { items, modelValue: value, label: '分组内容' },
    global: { plugins: [vuetify, i18n] },
  })
}

describe('AppTabs', () => {
  it('每段显示标签与计数；没有计数的段不显示计数', () => {
    const wrapper = mountTabs()
    const tabs = wrapper.findAll('[data-test^="app-tab-"]')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]!.text()).toContain('发现')
    expect(tabs[0]!.text()).toContain('3')
    expect(tabs[1]!.text()).toContain('0')
    // 没给 count 的段不画计数
    expect(tabs[2]!.text()).toBe('动作')
  })

  it('选中的段带 is-active，且标了 aria-selected', () => {
    const wrapper = mountTabs('monitors')
    expect(wrapper.get('[data-test="app-tab-monitors"]').classes()).toContain('k2-tabs__item--on')
    expect(wrapper.get('[data-test="app-tab-monitors"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-test="app-tab-discoveries"]').attributes('aria-selected')).toBe(
      'false',
    )
  })

  it('点另一段只发一次 update:modelValue，自己不存状态', async () => {
    const wrapper = mountTabs()
    await wrapper.get('[data-test="app-tab-actions"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['actions']])
    // 受控组件：父级没改 props，选中态还在原来那段
    expect(wrapper.get('[data-test="app-tab-discoveries"]').classes()).toContain(
      'k2-tabs__item--on',
    )
  })

  it('是 tablist，键盘/读屏能识别', () => {
    const wrapper = mountTabs()
    const list = wrapper.get('[role="tablist"]')
    expect(list.attributes('aria-label')).toBe('分组内容')
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3)
  })
})
