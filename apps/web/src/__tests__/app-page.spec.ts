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

  it('加载态显示骨架，默认内容不进 DOM', () => {
    const wrapper = mount(AppPage, { props: { loading: true }, slots: { default: '<p>内容</p>' } })
    expect(wrapper.find('[data-test="app-skeleton"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('内容')
  })

  it('加载态可以换成自己的骨架（loading 插槽）', () => {
    const wrapper = mount(AppPage, {
      props: { loading: true },
      slots: { loading: '<div class="my-skeleton" />' },
    })
    expect(wrapper.find('.my-skeleton').exists()).toBe(true)
    expect(wrapper.find('[data-test="app-skeleton"]').exists()).toBe(false)
  })

  it('空态显示空状态与它自己的按钮，默认内容同样不进 DOM', () => {
    const wrapper = mount(AppPage, {
      props: { empty: true, emptyTitle: '还没有分组', emptyNote: '先建一个' },
      slots: { default: '<p>内容</p>', 'empty-actions': '<button>新建分组</button>' },
    })
    expect(wrapper.get('[data-test="app-page-empty"]').text()).toContain('还没有分组')
    expect(wrapper.get('[data-test="app-page-empty"]').text()).toContain('新建分组')
    expect(wrapper.text()).not.toContain('内容')
  })

  it('错误带在头部下面，页面内容照常显示（不是整页替换）', () => {
    const wrapper = mount(AppPage, {
      props: { title: '配置管理', error: '部分数据没取到' },
      slots: { default: '<p>内容</p>' },
    })
    expect(wrapper.get('[data-test="app-page-error"]').text()).toContain('部分数据没取到')
    expect(wrapper.text()).toContain('内容')
    expect(wrapper.get('[data-test="app-page-error"]').classes()).toContain('app-hint--err')
  })

  it('加载优先于空态', () => {
    const wrapper = mount(AppPage, { props: { loading: true, empty: true } })
    expect(wrapper.find('[data-test="app-page-empty"]').exists()).toBe(false)
  })

  it('没有标题与操作时头部整块不渲染', () => {
    expect(
      mount(AppPage, { slots: { default: 'x' } })
        .find('.app-page__head')
        .exists(),
    ).toBe(false)
  })
})
