import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSwitch from '@/components/app/AppSwitch.vue'
import ChannelCard from '@/components/biz/ChannelCard.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(ChannelCard, {
    props: {
      name: '我的 Telegram',
      kindLabel: 'Telegram',
      enabled: true,
      tone: 'ok',
      statusText: '连通',
      detail: '目标会话 12345678',
      usedBy: 2,
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
  })
}

describe('ChannelCard', () => {
  it('类型、状态、名称、细节都在', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="channel-kind"]').text()).toBe('Telegram')
    expect(wrapper.find('[data-test="channel-status"]').text()).toBe('连通')
    expect(wrapper.find('[data-test="channel-status"]').classes()).toContain('app-status--ok')
    expect(wrapper.find('[data-test="channel-name"]').text()).toBe('我的 Telegram')
    expect(wrapper.find('[data-test="channel-detail"]').text()).toContain('12345678')
    expect(wrapper.find('[data-test="channel-used-by"]').text()).toContain('2')
  })

  it('几种状态语气各自成立：未测 / 有警告 / 不通 / 测试中', () => {
    expect(
      mountCard({ tone: 'neutral', statusText: '还没测过' })
        .find('[data-test="channel-status"]')
        .classes(),
    ).toContain('app-status--neutral')
    expect(mountCard({ tone: 'warn' }).find('[data-test="channel-status"]').classes()).toContain(
      'app-status--warn',
    )
    expect(mountCard({ tone: 'err' }).find('[data-test="channel-status"]').classes()).toContain(
      'app-status--err',
    )
    const busy = mountCard({ busy: true, statusText: '测试中' })
    expect(busy.find('[data-test="channel-status"]').classes()).toContain('app-status--busy')
    expect(busy.find('[data-test="channel-test"] .app-spinner').exists()).toBe(true)
  })

  it('停用只是变淡：照样能点进编辑，按钮也能用', async () => {
    const off = mountCard({ enabled: false })
    expect(off.classes()).toContain('is-off')
    await off.trigger('click')
    expect(off.emitted('edit')).toHaveLength(1)
    expect((off.find('[data-test="channel-test"]').element as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('点卡片进编辑，按钮各走各的事件（开关不会连带打开编辑）', async () => {
    const wrapper = mountCard()
    await wrapper.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)

    wrapper.findComponent(AppSwitch).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('toggle')).toEqual([[false]])

    await wrapper.find('[data-test="channel-test"]').trigger('click')
    expect(wrapper.emitted('test')).toHaveLength(1)
    await wrapper.find('[data-test="channel-delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    // 按钮在卡片里，但不能顺带触发"进编辑"
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })
})
