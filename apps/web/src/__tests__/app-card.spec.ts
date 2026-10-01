import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppCard from '@/components/app/AppCard.vue'

describe('AppCard', () => {
  it('标题、说明、内容、卡足按需渲染', () => {
    const wrapper = mount(AppCard, {
      props: { title: '采集', note: '每个分组一个来源' },
      slots: { default: '<p>正文</p>', footer: '<span>删除</span>' },
    })
    expect(wrapper.get('.app-card__title').text()).toBe('采集')
    expect(wrapper.get('.app-card__note').text()).toBe('每个分组一个来源')
    expect(wrapper.get('.app-card__body').text()).toContain('正文')
    expect(wrapper.get('.app-card__foot').text()).toContain('删除')
  })

  it('没有标题和操作时不渲染头部', () => {
    expect(
      mount(AppCard, { slots: { default: 'x' } })
        .find('.app-card__head')
        .exists(),
    ).toBe(false)
  })

  it('interactive：整卡可点，鼠标与键盘都能触发 activate', async () => {
    const wrapper = mount(AppCard, { props: { interactive: true }, slots: { default: 'x' } })
    expect(wrapper.classes()).toContain('is-interactive')
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('tabindex')).toBe('0')
    await wrapper.trigger('click')
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('activate')).toHaveLength(2)
  })

  it('disabled：置灰且点不动', async () => {
    const wrapper = mount(AppCard, {
      props: { interactive: true, disabled: true },
      slots: { default: 'x' },
    })
    expect(wrapper.classes()).toContain('is-disabled')
    expect(wrapper.attributes('tabindex')).toBeUndefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('activate')).toBeUndefined()
  })

  it('bare：内容区不带内边距（分栏/列表自己排版时用）', () => {
    expect(mount(AppCard, { props: { bare: true }, slots: { default: 'x' } }).classes()).toContain(
      'app-card',
    )
    expect(
      mount(AppCard, { props: { bare: true }, slots: { default: 'x' } })
        .get('.app-card__body')
        .classes(),
    ).toContain('app-card__body--bare')
  })
})
