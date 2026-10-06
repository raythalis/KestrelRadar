import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

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
    // Vuetify 的菜单浮层 teleport 到 body：必须真的挂进文档才点得开
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SourceCard', () => {
  it('不要左侧色条：状态只由状态块表达；路由等宽显示，实例地址不上卡', () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).toContain('k2-flip')
    expect(wrapper.html()).not.toMatch(/biz-card/)
    expect(wrapper.find('[data-test="source-target"]').text()).toBe('/bilibili/ranking/all')
    expect(wrapper.find('[data-test="source-target"]').classes()).toContain('k2-card__detail--mono')
  })

  it('卡上不写已收条数与解释性提示', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="source-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="source-message"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="source-instance"]').exists()).toBe(false)
  })

  it('抓取测试入口在小菜单里；卡脚状态块只表达启用与否', async () => {
    const wrapper = mountCard()
    // 卡脚状态芯片：启用＝success，停用＝neutral
    expect(wrapper.find('[data-test="source-status"]').classes().join(' ')).toContain(
      'k2-t-success',
    )
    expect(
      mountCard({ enabled: false }).find('[data-test="source-status"]').classes().join(' '),
    ).toContain('k2-t-neutral')

    await wrapper.find('[data-test="source-menu"]').trigger('click')
    await flushPromises()
    const test = document.querySelector('[data-test="source-test"]') as HTMLElement
    expect(test).not.toBeNull()
    test.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('test')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('抓取中：转圈且不给重复点；停用的源照样能试抓', async () => {
    const busy = mountCard({ busy: true })
    // 抓取中：菜单入口上出现转圈
    expect(busy.find('[data-test="source-testing"]').exists()).toBe(true)

    const off = mountCard({ enabled: false })
    // 停用不整张压暗：状态由开关说，颜色只说一遍
    expect(off.classes()).not.toContain('is-off')
    expect(off.find('[data-test="source-status"]').exists()).toBe(true)
    await off.find('[data-test="source-menu"]').trigger('click')
    await flushPromises()
    const test = document.querySelector('[data-test="source-test"]') as HTMLButtonElement
    // 停用 ≠ 不能试抓：试抓是排查手段，跟启用状态无关
    expect(test.disabled).toBe(false)
    test.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(off.emitted('test')).toHaveLength(1)
  })

  it('点卡片＝编辑；右上角 × 只删除，不误触编辑', async () => {
    const wrapper = mountCard()
    // 编辑 / 删除都在卡片小菜单里，卡面上没有常驻按钮
    expect(wrapper.find('[data-test="source-edit"]').exists()).toBe(false)
    await wrapper.find('[data-test="source-menu"]').trigger('click')
    await flushPromises()
    const edit = document.querySelector('[data-test="source-edit"]') as HTMLElement
    const del = document.querySelector('[data-test="source-delete"]') as HTMLElement
    expect(edit).not.toBeNull()
    expect(del).not.toBeNull()
    del.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('脚上写 cron 表达式 + 下次采集时间；停用的源只留表达式，不写下次', () => {
    const on = mountCard()
    // 卡脚按人话写频率（不再裸写 cron 表达式）
    expect(on.find('[data-test="source-plan"]').text().length).toBeGreaterThan(0)
    // 时区随运行环境，这里只校验形状：标签 + 月-日 时:分
    expect(on.find('[data-test="source-next-run"]').text()).toMatch(
      /^下次采集：\d{2}-\d{2} \d{2}:\d{2}$/,
    )

    const off = mountCard({ enabled: false })
    expect(off.find('[data-test="source-plan"]').exists()).toBe(true)
    expect(off.find('[data-test="source-next-run"]').exists()).toBe(false)

    const noTime = mountCard({ nextRunAt: null })
    expect(noTime.find('[data-test="source-next-run"]').exists()).toBe(false)
  })

  it('开关在卡脚（右下），开关状态由页面接', async () => {
    const wrapper = mountCard()
    // 启停入口也在小菜单里；卡脚只放状态、频率、下次时间与翻面按钮
    expect(
      wrapper.find('[data-test="source-foot"]').find('[data-test="flip-button"]').exists(),
    ).toBe(true)
    await wrapper.find('[data-test="source-menu"]').trigger('click')
    await flushPromises()
    const toggle = document.querySelector('[data-test="source-toggle"]') as HTMLElement
    expect(toggle).not.toBeNull()
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })
})
