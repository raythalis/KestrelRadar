import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChannelCard from '@/components/biz/ChannelCard.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(ChannelCard, {
    props: {
      name: '我的 Telegram',
      type: 'telegram',
      enabled: true,
      tone: 'ok',
      statusText: '连通',
      usedBy: 2,
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
  })
}

describe('ChannelCard', () => {
  it('第二行就是渠道类型枚举的文案，页面不用手写', () => {
    expect(mountCard().find('[data-test="channel-kind"]').text()).toBe('Telegram')
    expect(mountCard({ type: 'webhook' }).find('[data-test="channel-kind"]').text()).toBe('Webhook')
  })

  it('状态不写成一句文字：颜色走左侧色条，圆点用 title 说明', () => {
    const wrapper = mountCard({ tone: 'err', statusText: '连接失败' })
    expect(wrapper.classes()).toContain('biz-card--err')
    expect(wrapper.find('[data-test="channel-status"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('连接失败')
    expect(wrapper.find('[data-test="channel-test"]').attributes('title')).toBe(
      '连接失败 · 测试连通性',
    )
  })

  it('中间那行没有含义的细节没了，也不显示上次验证时间', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="channel-detail"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="channel-verified"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('上次验证')
  })

  it('没有开关、也没有编辑按钮：点卡片就是编辑', async () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="channel-enabled"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="channel-edit"]').exists()).toBe(false)

    await wrapper.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('右上角 × 只走删除，不会顺带进编辑', async () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="channel-delete"]').attributes('title')).toBe('删除')
    await wrapper.find('[data-test="channel-delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('右下角圆点走测试：平时不转、测试中转圈、异常时呼吸', async () => {
    const wrapper = mountCard()
    const probe = wrapper.find('[data-test="channel-test"]')
    expect(probe.classes()).not.toContain('biz-card__probe--busy')
    expect(probe.classes()).not.toContain('biz-card__probe--attention')

    await probe.trigger('click')
    expect(wrapper.emitted('test')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()

    const busy = mountCard({ busy: true })
    expect(busy.find('[data-test="channel-test"]').classes()).toContain('biz-card__probe--busy')
    expect(busy.find('[data-test="channel-test"]').attributes('title')).toBe('发送中…')

    expect(mountCard({ tone: 'err' }).find('[data-test="channel-test"]').classes()).toContain(
      'biz-card__probe--attention',
    )
    expect(mountCard({ tone: 'ok' }).find('[data-test="channel-test"]').classes()).not.toContain(
      'biz-card__probe--attention',
    )
  })

  it('停用只是变淡：照样能点进编辑、圆点照样能用', async () => {
    const off = mountCard({ enabled: false })
    expect(off.classes()).toContain('is-off')
    await off.trigger('click')
    expect(off.emitted('edit')).toHaveLength(1)
    expect((off.find('[data-test="channel-test"]').element as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})
