import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSwitch from '@/components/app/AppSwitch.vue'
import SourceCard from '@/components/biz/SourceCard.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(SourceCard, {
    props: {
      name: 'B 站排行',
      kindLabel: 'RSSHub 路由',
      enabled: true,
      target: '/bilibili/ranking/all',
      cron: '*/30 * * * *',
      nextRunAt: '2026-10-02T18:00:00+08:00',
      tone: 'ok',
      statusText: '有内容',
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
  })
}

describe('SourceCard', () => {
  it('不要左侧色条：状态只由状态块表达；路由等宽显示，实例地址不上卡', () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).toContain('biz-card--no-bar')
    expect(wrapper.find('[data-test="source-target"]').text()).toBe('/bilibili/ranking/all')
    expect(wrapper.find('[data-test="source-target"]').classes()).toContain('biz-card__sub--mono')
  })

  it('卡上不写已收条数与解释性提示', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="source-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="source-message"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="source-instance"]').exists()).toBe(false)
  })

  it('状态块本身就是抓取测试的入口，颜色分四档', async () => {
    const wrapper = mountCard()
    const chip = wrapper.find('[data-test="source-test"]')
    expect(chip.attributes('title')).toBe('抓取测试')
    expect(wrapper.find('[data-test="source-status"]').classes()).toContain('app-status--ok')

    await chip.trigger('click')
    expect(wrapper.emitted('test')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()

    const toneOf = (props: Record<string, unknown>) =>
      mountCard(props).find('[data-test="source-status"]').classes().join(' ')
    expect(toneOf({ tone: 'neutral', statusText: '抓取测试' })).toContain('app-status--neutral')
    expect(toneOf({ tone: 'warn' })).toContain('app-status--warn')
    expect(toneOf({ tone: 'err' })).toContain('app-status--err')
  })

  it('抓取中：转圈且不给重复点；停用的源也不给抓', async () => {
    const busy = mountCard({ busy: true })
    expect(busy.find('[data-test="source-status"]').classes()).toContain('app-status--busy')
    expect((busy.find('[data-test="source-test"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )

    const off = mountCard({ enabled: false })
    expect(off.classes()).toContain('is-off')
    await off.find('[data-test="source-test"]').trigger('click')
    expect(off.emitted('test')).toBeUndefined()
  })

  it('点卡片＝编辑；右上角 × 只删除，不误触编辑', async () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="source-edit"]').exists()).toBe(false)

    await wrapper.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)

    await wrapper.find('[data-test="source-delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('脚上写 cron 表达式 + 下次采集时间；停用的源只留表达式，不写下次', () => {
    const on = mountCard()
    expect(on.find('[data-test="source-cron"]').text()).toBe('*/30 * * * *')
    // 时区随运行环境，这里只校验形状：标签 + 月-日 时:分
    expect(on.find('[data-test="source-next-run"]').text()).toMatch(
      /^下次采集：\d{2}-\d{2} \d{2}:\d{2}$/,
    )

    const off = mountCard({ enabled: false })
    expect(off.find('[data-test="source-cron"]').text()).toBe('*/30 * * * *')
    expect(off.find('[data-test="source-next-run"]').exists()).toBe(false)

    const noTime = mountCard({ nextRunAt: null })
    expect(noTime.find('[data-test="source-next-run"]').exists()).toBe(false)
  })

  it('开关在卡脚（右下），开关状态由页面接', async () => {
    const wrapper = mountCard()
    const foot = wrapper.find('[data-test="source-foot"]')
    expect(foot.find('[data-test="source-enabled"]').exists()).toBe(true)

    wrapper.findComponent(AppSwitch).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })
})
