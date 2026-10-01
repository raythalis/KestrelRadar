import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import AppDialog from '@/components/app/AppDialog.vue'
import DesignView from '@/views/DesignView.vue'

function mountDesign() {
  return mount(DesignView, {
    global: { plugins: [createPinia(), vuetify, i18n, appComponents] },
  })
}

describe('/design 预览页', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('Foundation 六组 + 组件各一组，都在页面上', () => {
    const wrapper = mountDesign()
    expect(wrapper.find('[data-test="design-page"]').exists()).toBe(true)
    const titles = wrapper.findAll('.app-section__title').map((t) => t.text())
    for (const expected of [
      'Color',
      'Typography',
      'Spacing',
      'Radius',
      'Elevation',
      'AppButton',
      'AppInput / AppSelect',
      'AppSwitch',
      'AppStatus',
      'AppCard',
      'AppDialog',
      'AppEmptyState',
      'AppSkeleton',
      'AppHint',
      'AppPage / AppSection',
      'AppSidebar / AppHeader',
    ]) {
      expect(titles.some((t) => t.includes(expected))).toBe(true)
    }
  })

  it('AppButton 六种状态都在：变体、禁用、加载、撑满', () => {
    const wrapper = mountDesign()
    const text = wrapper.text()
    for (const label of [
      '主要操作',
      '次要操作',
      '弱化操作',
      '删除',
      '禁用',
      '保存中',
      '撑满宽度',
    ]) {
      expect(text).toContain(label)
    }
    expect(wrapper.findAll('[data-test="app-button"]').length).toBeGreaterThanOrEqual(10)
  })

  it('AppInput / AppSelect / AppSwitch 的状态都摊开了', () => {
    const wrapper = mountDesign()
    const inputs = wrapper.findAll('[data-test="app-input"]')
    expect(inputs.length).toBeGreaterThanOrEqual(5)
    expect(wrapper.findAll('[data-test="app-select"]').length).toBeGreaterThanOrEqual(4)
    expect(wrapper.findAll('[data-test="app-switch"]').length).toBe(3)
    expect(wrapper.text()).toContain('连不上这个地址')
  })

  it('AppStatus 五种语气 + 进行中都有样例', () => {
    const wrapper = mountDesign()
    const tones = wrapper.findAll('[data-test="app-status"]').map((s) => s.classes().join(' '))
    for (const tone of ['ok', 'warn', 'err', 'info', 'neutral', 'busy']) {
      expect(tones.some((c) => c.includes(`app-status--${tone}`))).toBe(true)
    }
  })

  it('AppSkeleton 四种版面与 AppEmptyState 两种用法都在', () => {
    const wrapper = mountDesign()
    expect(wrapper.findAll('[data-test="app-skeleton"]').length).toBe(4)
    expect(wrapper.findAll('[data-test="app-empty"]').length).toBe(2)
  })

  it('弹窗三种状态可由按钮打开（默认关闭；内容是 teleport 的，看 props 而不是 DOM）', async () => {
    const wrapper = mountDesign()
    const dialog = wrapper.findComponent(AppDialog)
    expect(dialog.props('modelValue')).toBe(false)

    const buttons = wrapper.findAll('[data-test="app-button"]')
    const openWith = async (label: string) => {
      const button = buttons.find((b) => b.text().includes(label))
      expect(button).toBeTruthy()
      await button!.trigger('click')
      await wrapper.vm.$nextTick()
    }

    await openWith('普通弹窗')
    expect(dialog.props('modelValue')).toBe(true)
    expect(dialog.props('loading')).toBe(false)
    expect(dialog.props('error')).toBeUndefined()

    await openWith('加载中')
    expect(dialog.props('loading')).toBe(true)

    await openWith('错误')
    expect(dialog.props('error')).toContain('500')
  })
})
