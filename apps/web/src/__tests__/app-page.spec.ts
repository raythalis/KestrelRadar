import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppPage from '@/components/app/AppPage.vue'

describe('AppPage', () => {
  it('默认宽度档是 default', () => {
    expect(mount(AppPage, { slots: { default: 'x' } }).classes()).toContain('app-page--default')
  })

  it('四档宽度各自有类名（这就是内容宽度策略的落点）', () => {
    for (const width of ['narrow', 'default', 'wide', 'full'] as const) {
      expect(mount(AppPage, { props: { width }, slots: { default: 'x' } }).classes()).toContain(
        `app-page--${width}`,
      )
    }
  })

  it('标题、说明、右侧操作按需渲染', () => {
    const wrapper = mount(AppPage, {
      props: { title: '配置管理', note: '一个分组就是一件你关注的事' },
      slots: { actions: '<button>新建</button>', default: '<p>内容</p>' },
    })
    expect(wrapper.get('.app-page__title').text()).toBe('配置管理')
    expect(wrapper.get('.app-page__note').text()).toBe('一个分组就是一件你关注的事')
    expect(wrapper.get('.app-page__actions').text()).toContain('新建')
  })

  it('没有标题与操作时头部整块不渲染', () => {
    expect(
      mount(AppPage, { slots: { default: 'x' } })
        .find('.app-page__head')
        .exists(),
    ).toBe(false)
  })
})
