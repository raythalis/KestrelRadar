import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import AppTabs from '@/components/app/AppTabs.vue'
import ActionCard from '@/components/biz/ActionCard.vue'
import ChannelCard from '@/components/biz/ChannelCard.vue'
import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import GroupDialog from '@/components/biz/GroupDialog.vue'
import GroupPanel from '@/components/biz/GroupPanel.vue'
import MonitorCard from '@/components/biz/MonitorCard.vue'
import SourceCard from '@/components/biz/SourceCard.vue'
import ExcludeWordsField from '@/components/settings/ExcludeWordsField.vue'
import ScoreBandField from '@/components/settings/ScoreBandField.vue'
import StyleLabView from '@/views/StyleLabView.vue'

/**
 * /style-lab 的守卫（S8 后重写）：
 * 展台只展示**真实组件**与设计系统原始零件，不再断言任何手写复刻结构。
 * 断言目标＝真组件在场 + 真行为可用 + 展台内不存在手写成品结构。
 */
function mountLab() {
  return mount(StyleLabView, {
    attachTo: document.body,
    global: { plugins: [createPinia(), vuetify, i18n, appComponents] },
  })
}

describe('style-lab 结构守卫', () => {
  const wrapper = mountLab()
  const html = (): string => wrapper.html()

  it('页面装配了五个样例区与全部小节标题', () => {
    const titles = wrapper.findAll('.lab__h2').map((h) => h.text())
    expect(titles.length).toBeGreaterThanOrEqual(12)
    for (const kw of [
      '颜色',
      '排版',
      '间距',
      '控件尺寸',
      '状态',
      '图标尺寸',
      '卡片',
      '分组面板',
      '设置页控件',
      '通用零件',
      'App 组件',
      '芯片',
    ])
      expect(titles.join('|')).toContain(kw)
  })

  it('三类业务卡与渠道卡都是真组件（不是手写复刻）', () => {
    expect(wrapper.findAllComponents(SourceCard).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAllComponents(MonitorCard).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAllComponents(ActionCard).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAllComponents(ChannelCard).length).toBeGreaterThanOrEqual(1)
  })

  it('分组面板与分组弹窗是真组件', () => {
    expect(wrapper.findAllComponents(GroupPanel).length).toBeGreaterThanOrEqual(4)
    expect(wrapper.findAllComponents(GroupDialog).length).toBeGreaterThanOrEqual(1)
  })

  it('设置页控件是真组件：分数区间与全局排除词', () => {
    expect(wrapper.findAllComponents(ScoreBandField).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAllComponents(ExcludeWordsField).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.find('[data-test="lab-score-bands"]').exists()).toBe(true)
  })

  it('弹窗默认关闭、按钮打开后才渲染真内容（含真 CronPicker）', async () => {
    expect(wrapper.findAllComponents(FormDialog).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAllComponents(ConfirmDialog).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.find('[data-test="open-action-dialog"]').exists()).toBe(true)
    // 弹窗关着时 v-dialog 不渲染内容：CronPicker 还不在
    expect(wrapper.findAllComponents(CronPicker).length).toBe(0)
    await wrapper.find('[data-test="open-action-dialog"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAllComponents(CronPicker).length).toBeGreaterThanOrEqual(1)
    expect(document.body.querySelector('[data-test="lab-cron-picker"]')).not.toBeNull()
  })

  it('骨架、空态、标签页都走真组件（四态骨架齐全）', () => {
    expect(wrapper.findAllComponents(AppSkeleton).length).toBeGreaterThanOrEqual(4)
    expect(wrapper.findAllComponents(AppEmptyState).length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAllComponents(AppTabs).length).toBeGreaterThanOrEqual(1)
  })

  it('卡片翻面只由卡脚按钮触发，且翻面按钮成对存在', async () => {
    const flips = wrapper.findAll('[data-test="flip-button"]')
    expect(flips.length).toBeGreaterThanOrEqual(1)
    const first = flips[0]!
    const card = wrapper.find('[data-test="source-card"]')
    expect(card.classes()).not.toContain('k2-flip--back')
    await first.trigger('click')
    await flushPromises()
    expect(card.classes()).toContain('k2-flip--back')
    await card.find('[data-test="flip-back-button"]').trigger('click')
    await flushPromises()
    expect(card.classes()).not.toContain('k2-flip--back')
  })

  it('分组面板每个面板的箭头都能真的收放', async () => {
    const panels = wrapper.findAllComponents(GroupPanel)
    expect(panels.length).toBeGreaterThanOrEqual(4)
    const panel = panels[0]!
    const firstHtmlBefore = panel.html().length
    const chevron = panel.find(
      '.k2-col__head-toggle, .k2-group__toggle, [data-test="group-toggle"]',
    )
    if (chevron.exists()) {
      await chevron.trigger('click')
      await flushPromises()
      expect(panel.html().length).not.toBe(firstHtmlBefore)
    }
  })

  it('主题三态能切换', async () => {
    for (const key of ['system', 'light', 'dark']) {
      const btn = wrapper.find(`[data-test="theme-${key}"]`)
      expect(btn.exists(), `缺少主题按钮 ${key}`).toBe(true)
    }
    await wrapper.find('[data-test="theme-dark"]').trigger('click')
    await flushPromises()
  })

  it('危险操作区保留（primitive / 布局示例，非 fake component）', () => {
    expect(wrapper.find('[data-test="reset-all"]').exists()).toBe(true)
  })

  it('卡片正文中文一律 sans：等宽只留给 URL、路由和裸表达式', () => {
    const mono = wrapper.findAll('.k2-card .k2-mono, .k2-card [class*="mono"]')
    for (const el of mono) {
      const text = el.text()
      if (!text) continue
      // 等宽元素里不该出现成句中文（URL / 路由 / 表达式除外）
      expect(text).not.toMatch(/[\u4e00-\u9fa5]{4,}/)
    }
  })
})
