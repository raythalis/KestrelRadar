import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSection from '@/components/app/AppSection.vue'

describe('AppSection', () => {
  it('标题、说明与右侧操作', () => {
    const wrapper = mount(AppSection, {
      props: { title: '采集', note: '每一列一个来源' },
      slots: { actions: '<button>试抓</button>', default: '<div>内容</div>' },
    })
    expect(wrapper.get('.app-section__title').text()).toBe('采集')
    expect(wrapper.get('.app-section__note').text()).toBe('每一列一个来源')
    expect(wrapper.get('.app-section__actions').text()).toContain('试抓')
    expect(wrapper.text()).toContain('内容')
  })

  it('无标题无操作时头部不渲染', () => {
    expect(
      mount(AppSection, { slots: { default: 'x' } })
        .find('.app-section__head')
        .exists(),
    ).toBe(false)
  })
})
