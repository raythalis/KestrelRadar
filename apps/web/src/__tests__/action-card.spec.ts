import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSwitch from '@/components/app/AppSwitch.vue'
import ActionCard from '@/components/biz/ActionCard.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(ActionCard, {
    props: {
      name: '推给 Telegram',
      triggerLabel: '实时推送',
      channelName: '我的 Telegram',
      templateName: '默认模板',
      enabled: true,
      referencedCount: 1,
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
  })
}

describe('ActionCard', () => {
  it('触发方式、渠道、模板、被引用次数都在', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="action-trigger"]').text()).toBe('实时推送')
    expect(wrapper.find('[data-test="action-channel"]').text()).toContain('我的 Telegram')
    expect(wrapper.find('[data-test="action-template"]').text()).toContain('默认模板')
    expect(wrapper.find('[data-test="action-referenced"]').text()).toContain('1')
    expect(wrapper.find('[data-test="action-warning"]').exists()).toBe(false)
  })

  it('定时汇总会带上 cron 表达式标签（等宽）', () => {
    const wrapper = mountCard({ triggerLabel: '定时汇总', cronExpression: '0 8 * * *' })
    expect(wrapper.find('[data-test="action-cron"]').text()).toBe('0 8 * * *')
    expect(wrapper.find('[data-test="action-cron"]').classes()).toContain('biz-card__sub--mono')
  })

  it('没选渠道时明确提醒，这是这条动作真正的问题', () => {
    const wrapper = mountCard({ channelName: undefined })
    expect(wrapper.find('[data-test="action-channel"]').text()).toContain('还没选')
    expect(wrapper.find('[data-test="action-warning"]').text()).toContain('发不出去')
  })

  it('停用变淡但仍可编辑；不可用则点不动', async () => {
    const off = mountCard({ enabled: false })
    expect(off.classes()).toContain('is-off')
    await off.trigger('click')
    expect(off.emitted('edit')).toHaveLength(1)

    const disabled = mountCard({ disabled: true })
    await disabled.trigger('click')
    expect(disabled.emitted('edit')).toBeUndefined()
  })

  it('事件：编辑 / 删除 / 开关', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="action-edit"]').trigger('click')
    await wrapper.find('[data-test="action-delete"]').trigger('click')
    wrapper.findComponent(AppSwitch).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })
})
