import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

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
  })
}

describe('MonitorCard', () => {
  it('没有左侧色条、没有底部按钮行；点整张卡＝编辑', async () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).toContain('biz-card--no-bar')
    expect(wrapper.find('[data-test="monitor-edit"]').exists()).toBe(false)

    await wrapper.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('右上角 ×＝删除，且不会顺带触发编辑', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="monitor-delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('名称与判定模式都在卡头', () => {
    const wrapper = mountCard({ modeLabel: '算法 + LLM' })
    expect(wrapper.find('[data-test="monitor-name"]').text()).toBe('舞蹈相关')
    expect(wrapper.find('[data-test="monitor-mode"]').text()).toBe('算法 + LLM')
  })

  it('关键词最多摊三个，多的给 +N；匹配方式跟在后面', () => {
    const three = mountCard({ keywords: ['a', 'b', 'c', 'd'] })
    const tags = three.findAll('[data-test="monitor-keywords"] .app-tag')
    expect(tags.map((tag) => tag.text())).toEqual(['a', 'b', 'c', '+1'])
    expect(three.find('[data-test="monitor-match"]').text()).toBe('任意命中')

    const five = mountCard({ keywords: ['a', 'b', 'c', 'd', 'e'] })
    const fiveTags = five.findAll('[data-test="monitor-keywords"] .app-tag')
    expect(fiveTags[fiveTags.length - 1]?.text()).toBe('+2')
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

  it('卡脚：灵敏度、排除词数量、仅走指定动作，开关在右下', async () => {
    const wrapper = mountCard({
      excludeCount: 2,
      boundActionsLabel: '仅走 推给 Telegram',
    })
    const foot = wrapper.find('[data-test="monitor-foot"]')
    expect(foot.find('[data-test="monitor-sensitivity"]').text()).toBe('灵敏度 标准')
    expect(foot.find('[data-test="monitor-excludes"]').text()).toBe('排除 2 个词')
    expect(foot.find('[data-test="monitor-bound-actions"]').text()).toBe('仅走 推给 Telegram')

    await wrapper.findComponent({ name: 'VSwitch' }).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })

  it('没有排除词、不绑定动作时不占位置', () => {
    const foot = mountCard().find('[data-test="monitor-foot"]')
    expect(foot.find('[data-test="monitor-excludes"]').exists()).toBe(false)
    expect(foot.find('[data-test="monitor-bound-actions"]').exists()).toBe(false)
  })

  it('停用的监听整张卡变淡但还能编辑', async () => {
    const wrapper = mountCard({ enabled: false })
    expect(wrapper.classes()).toContain('is-off')
    await wrapper.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })
})
