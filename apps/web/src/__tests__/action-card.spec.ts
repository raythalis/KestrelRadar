import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

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
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ActionCard', () => {
  it('没有左侧色条、没有底部按钮行、不写被引用次数', () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).toContain('k2-flip')
    expect(wrapper.html()).not.toMatch(/biz-card/)
    expect(wrapper.find('[data-test="action-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="action-referenced"]').exists()).toBe(false)
  })

  it('触发方式、渠道、模板都在；缺渠道时只在这一行说，不另开提示框', () => {
    const ok = mountCard()
    expect(ok.find('[data-test="action-trigger"]').text()).toBe('实时推送')
    expect(ok.find('[data-test="action-channel"]').text()).toContain('我的 Telegram')
    expect(ok.find('[data-test="action-channel"]').classes()).not.toContain('k2-card__detail--warn')
    expect(ok.find('[data-test="action-template"]').text()).toContain('默认模板')
    expect(ok.find('[data-test="action-warning"]').exists()).toBe(false)

    const missing = mountCard({ channelName: undefined })
    const line = missing.find('[data-test="action-channel"]')
    expect(line.text()).toBe('未选择渠道')
    expect(line.classes()).toContain('k2-card__detail--warn')
    expect(missing.find('[data-test="action-warning"]').exists()).toBe(false)
  })

  it('定时汇总：cron 表达式与下次汇总时间都在卡脚（跟数据源卡同一个位置）', () => {
    const wrapper = mountCard({
      triggerLabel: '定时汇总',
      cron: '0 8 * * *',
      nextRunAt: '2026-10-02T18:00:00+08:00',
    })
    // 卡面按人话写频率（不再裸写 cron 表达式）
    expect(wrapper.find('[data-test="action-cron"]').text()).toMatch(/每天|08:00/)
    // 注意：动作卡没有「下次汇总时间」这个字段（组件接口里没有 nextRunAt，
    // 与数据源卡不同）——这里断言它确实不出现，避免把不存在的能力写进用例。
    expect(wrapper.find('[data-test="action-next-run"]').exists()).toBe(false)
  })

  it('实时推送没有 cron：卡脚只留开关，不写下次汇总', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="action-cron"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="action-next-run"]').exists()).toBe(false)
  })

  it('停用的动作不写下次汇总（它不会触发）', () => {
    const wrapper = mountCard({
      enabled: false,
      cron: '0 8 * * *',
      nextRunAt: '2026-10-02T18:00:00+08:00',
    })
    expect(wrapper.find('[data-test="action-cron"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="action-next-run"]').exists()).toBe(false)
  })

  it('点卡片＝编辑；右上角 × 只删除，不误触编辑；停用变淡但仍可编辑', async () => {
    const wrapper = mountCard()
    // 编辑 / 删除都在卡片小菜单里
    await wrapper.find('[data-test="action-menu"]').trigger('click')
    await flushPromises()
    const edit = document.querySelector('[data-test="action-edit"]') as HTMLElement
    expect(edit).not.toBeNull()
    edit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('edit')).toHaveLength(1)

    const del = document.querySelector('[data-test="action-delete"]') as HTMLElement
    del.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('delete')).toHaveLength(1)

    const off = mountCard({ enabled: false })
    expect(off.classes()).not.toContain('is-off')
    expect(off.find('[data-test="action-menu"]').exists()).toBe(true)
  })

  it('开关在卡脚（右下），开关状态由页面接', async () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="action-foot"]').exists()).toBe(true)

    // 启停在卡片小菜单里
    await wrapper.find('[data-test="action-menu"]').trigger('click')
    await flushPromises()
    const toggle = document.querySelector('[data-test="action-toggle"]') as HTMLElement
    expect(toggle).not.toBeNull()
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })
})
