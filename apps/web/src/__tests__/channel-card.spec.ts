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
      probe: 'idle',
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

  it('图标跟类型走，且都真的存在于图标字体里（写错名字会是空白）', () => {
    expect(mountCard().find('[data-test="channel-icon"] .v-icon').classes()).toContain('mdi-send')
    expect(
      mountCard({ type: 'webhook' }).find('[data-test="channel-icon"] .v-icon').classes(),
    ).toContain('mdi-webhook')
  })

  it('卡上不写「被几个动作用着」这类影响面信息', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="channel-used-by"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('动作使用')
  })

  it('状态不写成一句文字：颜色走左侧色条，圆点只写它是什么', () => {
    const wrapper = mountCard({ tone: 'err', probe: 'fail' })
    expect(wrapper.classes()).toContain('biz-card--err')
    expect(wrapper.find('[data-test="channel-status"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('连接失败')
    // 圆点提示不写状态字
    expect(wrapper.find('[data-test="channel-test"]').attributes('title')).toBe('测试连通性')
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

  it('圆点状态机：未测／连通／有警告／失败／测试中五种状态各有自己的类', async () => {
    const idle = mountCard()
    expect(idle.find('[data-test="channel-test"]').classes()).toContain('biz-card__probe--idle')

    await idle.find('[data-test="channel-test"]').trigger('click')
    expect(idle.emitted('test')).toHaveLength(1)
    expect(idle.emitted('edit')).toBeUndefined()

    expect(
      mountCard({ probe: 'ok' }).find('[data-test="channel-test"]').classes(),
    ).toContain('biz-card__probe--ok')
    expect(
      mountCard({ probe: 'warn' }).find('[data-test="channel-test"]').classes(),
    ).toContain('biz-card__probe--warn')
    expect(
      mountCard({ probe: 'fail' }).find('[data-test="channel-test"]').classes(),
    ).toContain('biz-card__probe--fail')

    // 测试中：转圈，并且点不动
    const testing = mountCard({ probe: 'testing' })
    const dot = testing.find('[data-test="channel-test"]')
    expect(dot.classes()).toContain('biz-card__probe--testing')
    expect((dot.element as HTMLButtonElement).disabled).toBe(true)
    expect(dot.attributes('aria-busy')).toBe('true')
    await dot.trigger('click')
    expect(testing.emitted('test')).toBeUndefined()
  })

  it('停用只是变淡：还能点进编辑，但测试圆点不可点', async () => {
    const off = mountCard({ enabled: false })
    expect(off.classes()).toContain('is-off')
    await off.trigger('click')
    expect(off.emitted('edit')).toHaveLength(1)

    const dot = off.find('[data-test="channel-test"]')
    expect((dot.element as HTMLButtonElement).disabled).toBe(true)
    await dot.trigger('click')
    expect(off.emitted('test')).toBeUndefined()
  })
})
