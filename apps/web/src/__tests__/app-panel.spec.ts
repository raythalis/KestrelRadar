import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppPanel from '@/components/app/AppPanel.vue'

describe('AppPanel', () => {
  it('有插槽才渲染头与底，内容区始终在', () => {
    const bare = mount(AppPanel, { slots: { default: '<p>内容</p>' } })
    expect(bare.find('[data-test="app-panel-head"]').exists()).toBe(false)
    expect(bare.find('[data-test="app-panel-foot"]').exists()).toBe(false)
    expect(bare.find('[data-test="app-panel-body"]').text()).toContain('内容')

    const full = mount(AppPanel, {
      slots: {
        head: '<span>标题</span>',
        default: '<p>内容</p>',
        foot: '<button>查看全部</button>',
      },
    })
    expect(full.find('.k2-panel__head').text()).toBe('标题')
    expect(full.find('.k2-panel__foot').text()).toBe('查看全部')
  })

  it('默认在面板内滚动，可以关掉', () => {
    expect(mount(AppPanel).find('[data-test="app-panel-body"]').classes()).toContain(
      'k2-panel__body--scroll',
    )
    expect(
      mount(AppPanel, { props: { scroll: false } })
        .find('[data-test="app-panel-body"]')
        .classes(),
    ).not.toContain('k2-panel__body--scroll')
  })

  it('高度按传入值给到面板，默认跟视口走', () => {
    const custom = mount(AppPanel, { props: { height: '320px' } })
    expect(custom.find('[data-test="app-panel"]').attributes('style')).toContain('320px')

    const byDefault = mount(AppPanel)
    expect(byDefault.find('[data-test="app-panel"]').attributes('style')).toContain(
      'min(62vh, 620px)',
    )
  })

  it('高度默认按「有没有底栏」换算：没底栏就把底栏那一条减掉', () => {
    const withFoot = mount(AppPanel, { slots: { foot: '<button>查看全部</button>' } })
    const noFoot = mount(AppPanel)
    expect(withFoot.find('[data-test="app-panel"]').attributes('style')).not.toContain('- 44px')
    expect(noFoot.find('[data-test="app-panel"]').attributes('style')).toContain('- 44px')
    // 显式传高度时，以调用方给的值为准
    expect(
      mount(AppPanel, { props: { height: '320px' } })
        .find('[data-test="app-panel"]')
        .attributes('style'),
    ).toContain('320px')
  })
})
