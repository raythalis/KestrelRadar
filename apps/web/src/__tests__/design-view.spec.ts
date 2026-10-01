import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import DesignView from '@/views/DesignView.vue'

function mountDesign() {
  return mount(DesignView, { global: { plugins: [createPinia(), vuetify, i18n] } })
}

describe('/design 预览页', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('展示 Foundation、核心组件、页面宽度与间距四块', () => {
    const wrapper = mountDesign()
    for (const test of [
      'design-page',
      'design-foundation',
      'design-components',
      'design-page-widths',
      'design-space',
    ]) {
      expect(wrapper.find(`[data-test="${test}"]`).exists()).toBe(true)
    }
  })

  it('色值清单来自 tokens，主题切换时跟着变', async () => {
    const wrapper = mountDesign()
    const first = wrapper.findAll('.ds-token__swatch').length
    expect(first).toBeGreaterThan(10)

    const { useUiStore } = await import('@/stores/ui')
    const ui = useUiStore()
    const before = wrapper.html()
    ui.setPreference(ui.isDark ? 'light' : 'dark')
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).not.toBe(before)
  })

  it('每个色值都带变量名与值，字号与间距也都列出来', () => {
    const wrapper = mountDesign()
    const names = wrapper.findAll('.ds-token__name').map((n) => n.text())
    expect(names.some((n) => n.includes('--k-bg'))).toBe(true)
    expect(names.some((n) => n.includes('--k-accent'))).toBe(true)
    expect(names.some((n) => n.includes('--k-fs-body'))).toBe(true)
    expect(names.some((n) => n.includes('--k-space-3'))).toBe(true)
    expect(wrapper.findAll('.ds-token__radius').length).toBeGreaterThanOrEqual(4)
  })
})
