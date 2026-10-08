import { flushPromises, mount } from '@vue/test-utils'
import type { Group } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'

import GroupPanel from '@/components/biz/GroupPanel.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

const group: Group = {
  id: 'g1',
  name: 'AI 圈',
  description: '模型发布与开源项目',
  enabled: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

function mountPanel(overrides: Record<string, unknown> = {}) {
  return mount(GroupPanel, {
    props: {
      group,
      counts: { discoveries: 2, monitors: 1, actions: 0 },
      expanded: false,
      ...overrides,
    },
    global: { plugins: [createPinia(), vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GroupPanel', () => {
  it('摘要行给名称、简介与三列计数', () => {
    const wrapper = mountPanel()
    expect(wrapper.get('[data-test="group-name"]').text()).toBe('AI 圈')
    expect(wrapper.get('[data-test="group-description"]').text()).toBe('模型发布与开源项目')
    // 三列计数：文案形如「发现 2 / 监听 1 / 动作 0」
    const counts = wrapper.get('[data-test="group-counts"]').text()
    expect(counts).toContain('发现')
    expect(counts).toContain('监听')
    expect(counts).toContain('动作')
    expect(counts).toMatch(/发现\D*2/)
    expect(counts).toMatch(/监听\D*1/)
  })

  it('没有简介时不占一行', () => {
    const wrapper = mountPanel({ group: { ...group, description: '' } })
    expect(wrapper.find('[data-test="group-description"]').exists()).toBe(false)
  })

  it('启停由摘要行的开关表达，不整块压暗（同一状态只说一次）', () => {
    const on = mountPanel()
    expect(on.get('[data-test="group-enabled"]').classes()).toContain('k2-switch--on')

    const off = mountPanel({ group: { ...group, enabled: false } })
    expect(off.get('[data-test="group-panel"]').classes()).not.toContain('is-off')
    expect(off.get('[data-test="group-enabled"]').classes()).not.toContain('k2-switch--on')
  })

  it('分组名与列标题同为 16 / 14 的层级：名称在摘要行、标题在列头', () => {
    const wrapper = mountPanel({ expanded: true })
    expect(wrapper.get('[data-test="group-name"]').text()).toBe('AI 圈')
    const head = wrapper.get('[data-test="column-discoveries"] .k2-col__head').text()
    expect(head).toContain('发现')
    expect(head).toContain('2')
  })

  it('编辑与删除在摘要行的小菜单里（删除是危险项）', async () => {
    const wrapper = mountPanel({})
    await wrapper.get('[data-test="group-menu"]').trigger('click')
    await flushPromises()
    const del = document.querySelector('[data-test="group-menu-delete"]') as HTMLElement
    const edit = document.querySelector('[data-test="group-menu-edit"]') as HTMLElement
    expect(edit).not.toBeNull()
    expect(del).not.toBeNull()
    expect(del.className).toContain('danger')
  })

  it('折叠时不渲染三列，展开后三列都在', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('[data-test="column-discoveries"]').exists()).toBe(false)

    await wrapper.setProps({ expanded: true })
    expect(wrapper.find('[data-test="column-discoveries"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="column-monitors"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="column-actions"]').exists()).toBe(true)
    // 空列是虚线占位卡：一句空文案 + 一句怎么开始
    expect(wrapper.get('[data-test="column-actions"]').text()).toContain('还没有动作')
    expect(wrapper.get('[data-test="column-actions"]').text()).toContain('添加一个通知动作')
  })

  it('箭头、编辑、删除、开关都只发事件（组件本身不写状态）', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-test="group-toggle"]').trigger('click')
    await wrapper.get('[data-test="group-menu"]').trigger('click')
    await flushPromises()
    ;(document.querySelector('[data-test="group-menu-edit"]') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    await flushPromises()
    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)

    await wrapper.get('[data-test="group-enabled"]').trigger('click')
    expect(wrapper.emitted('toggle-enabled')).toEqual([[false]])
  })

  it('三列各有自己的「添加」入口', async () => {
    const wrapper = mountPanel({ expanded: true })
    await wrapper.get('[data-test="add-discoveries"]').trigger('click')
    await wrapper.get('[data-test="add-monitors"]').trigger('click')
    // 空列走虚线占位卡（没有条数时列头不放添加入口）
    await wrapper.get('[data-test="add-actions-empty"]').trigger('click')
    expect(wrapper.emitted('add')).toEqual([['discoveries'], ['monitors'], ['actions']])
  })

  it('窄屏标签切换：点哪段哪列是当前列，标签尾部带计数', async () => {
    const wrapper = mountPanel({ expanded: true })
    expect(wrapper.get('[data-test="column-discoveries"]').classes()).toContain('k2-col--on')
    expect(wrapper.get('[data-test="app-tab-monitors"]').text()).toContain('1')

    await wrapper.get('[data-test="app-tab-monitors"]').trigger('click')
    expect(wrapper.get('[data-test="column-monitors"]').classes()).toContain('k2-col--on')
    expect(wrapper.get('[data-test="column-discoveries"]').classes()).not.toContain('k2-col--on')
  })

  it('空列占位卡点一下就开新增（和列头的添加同一个事件）', async () => {
    const wrapper = mountPanel({ expanded: true })
    await wrapper.get('[data-test="add-actions-empty"]').trigger('click')
    expect(wrapper.emitted('add')).toEqual([['actions']])
  })

  it('卡片由页面通过插槽填进来', () => {
    const wrapper = mount(GroupPanel, {
      props: {
        group,
        counts: { discoveries: 1, monitors: 0, actions: 0 },
        expanded: true,
      },
      slots: { discoveries: '<p data-test="slot-card">卡片</p>' },
      global: { plugins: [createPinia(), vuetify, i18n, appComponents] },
    })
    expect(wrapper.get('[data-test="slot-card"]').text()).toBe('卡片')
  })
})
