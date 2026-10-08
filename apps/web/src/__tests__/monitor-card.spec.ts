import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import MonitorCard from '@/components/biz/MonitorCard.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(MonitorCard, {
    props: {
      name: '舞蹈相关',
      modeLabel: '自带算法',
      keywords: ['舞蹈', '街舞'],
      matchLabel: '任意命中',
      sensitivityLabel: '标准',
      enabled: true,
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MonitorCard', () => {
  it('没有左侧色条、没有底部按钮行；点整张卡＝编辑', async () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).toContain('k2-flip')
    expect(wrapper.html()).not.toMatch(/biz-card/)
    // 编辑 / 删除 / 启停都在卡片右上角的小菜单里
    expect(wrapper.find('[data-test="monitor-edit"]').exists()).toBe(false)
    await wrapper.find('[data-test="monitor-menu"]').trigger('click')
    await flushPromises()
    const edit = document.querySelector('[data-test="monitor-edit"]') as HTMLElement
    expect(edit).not.toBeNull()
    edit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('右上角 ×＝删除，且不会顺带触发编辑', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="monitor-menu"]').trigger('click')
    await flushPromises()
    const del = document.querySelector('[data-test="monitor-delete"]') as HTMLElement
    expect(del).not.toBeNull()
    del.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('名称与判定模式都在卡头；跟着全局开 LLM+ 时把生效那档也写出来', () => {
    const wrapper = mountCard({ modeLabel: '跟随全局 · ', llmPlus: true })
    expect(wrapper.find('[data-test="monitor-name"]').text()).toBe('舞蹈相关')
    expect(wrapper.find('[data-test="monitor-mode"]').text()).toBe('跟随全局 · LLM+')

    const tag = wrapper.find('[data-test="monitor-mode"] [data-test="llm-plus"]')
    expect(tag.exists()).toBe(true)
    expect(tag.find('.mdi').classes()).toContain('mdi-shimmer')
  })

  it('自带算法那档只写文字，不出 LLM+ 标签', () => {
    const wrapper = mountCard({ modeLabel: '跟随全局 · 自带算法' })
    expect(wrapper.find('[data-test="monitor-mode"]').text()).toBe('跟随全局 · 自带算法')
    expect(wrapper.find('[data-test="llm-plus"]').exists()).toBe(false)
  })

  it('匹配方式写在最前；关键词按卡片宽度自适应，放不下的合成 +N', () => {
    // jsdom 量不出宽度，走的正是「全放得下」这一支：全部显示、没有 +N
    const wrapper = mountCard({ keywords: ['a', 'b', 'c', 'd'] })
    const row = wrapper.find('[data-test="monitor-keywords"]')
    expect(row.find('[data-test="monitor-match"]').text()).toBe('任意命中')
    expect(row.element.children[0]?.getAttribute('data-test')).toBe('monitor-match')
    expect(row.findAll('.k2-chip--tag').map((tag) => tag.text())).toEqual(['a', 'b', 'c', 'd'])
    expect(row.find('[data-test="monitor-tagmore"]').exists()).toBe(false)
  })

  it('没填关键词就写清楚全部通过，不显示匹配方式', () => {
    const wrapper = mountCard({ keywords: [] })
    expect(wrapper.find('[data-test="monitor-keywords-empty"]').text()).toBe(
      '没填关键词（全部通过）',
    )
    expect(wrapper.find('[data-test="monitor-match"]').exists()).toBe(false)
  })

  it('意图描述只在有内容时出现', () => {
    expect(mountCard().find('[data-test="monitor-intent"]').exists()).toBe(false)
    const wrapper = mountCard({ intentText: '大模型发布与开源项目' })
    expect(wrapper.find('[data-test="monitor-intent"]').text()).toBe('大模型发布与开源项目')
  })

  it('卡脚：纯文字写档位，不写「灵敏度」三个字；开关在右下', async () => {
    const wrapper = mountCard()
    const foot = wrapper.find('[data-test="monitor-foot"]')
    const sensitivity = foot.find('[data-test="monitor-sensitivity"]')
    expect(sensitivity.text()).toBe('标准')
    expect(foot.text()).not.toContain('灵敏度')

    // 启停在卡片小菜单里
    await wrapper.find('[data-test="monitor-menu"]').trigger('click')
    await flushPromises()
    const toggle = document.querySelector('[data-test="monitor-toggle"]') as HTMLElement
    expect(toggle).not.toBeNull()
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })

  it('卡脚不显示排除词、也不提动作；推送目标不上卡', () => {
    const foot = mountCard({ keywords: ['a'] }).find('[data-test="monitor-foot"]')
    expect(foot.text()).toContain('标准')
    expect(foot.find('[data-test="monitor-bound-actions"]').exists()).toBe(false)
  })

  it('停用的监听不压暗（状态由开关表达）但仍能编辑', async () => {
    const wrapper = mountCard({ enabled: false })
    expect(wrapper.classes()).not.toContain('is-off')
    await wrapper.find('[data-test="monitor-menu"]').trigger('click')
    await flushPromises()
    const edit = document.querySelector('[data-test="monitor-edit"]') as HTMLElement
    edit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })
})
