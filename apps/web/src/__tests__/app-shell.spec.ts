import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '@/stores/ui'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/layouts/AppShell.vue'
import i18n from '@/plugins/i18n'
// 用真实主题：AppShell 会在 kestrelLight / kestrelDark 之间切
import vuetify from '@/plugins/vuetify'

const Empty = { template: '<div />' }

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: Empty },
      { path: '/config', name: 'config', component: Empty },
      { path: '/channels', name: 'channels', component: Empty },
      { path: '/models', name: 'models', component: Empty },
      { path: '/settings', name: 'settings', component: Empty },
    ],
  })
}

function mountShell() {
  const router = buildRouter()
  const pinia = createPinia()
  return {
    router,
    pinia,
    wrapper: mount(AppShell, {
      global: { plugins: [pinia, vuetify, i18n, router] },
    }),
  }
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'zh-CN'
  })

  it('渲染应用名与五个导航入口', () => {
    const { wrapper } = mountShell()
    expect(wrapper.get('[data-test="app-name"]').text()).toContain('Kestrel')
    for (const name of ['dashboard', 'config', 'channels', 'models', 'settings']) {
      expect(wrapper.find(`[data-test="${`nav-${name}`}"]`).exists()).toBe(true)
    }
    expect(wrapper.get('[data-test="nav-config"]').text()).toBe('配置管理')
  })

  it('存过英文的话，刷新后界面直接是英文', () => {
    localStorage.setItem('kestrel-ui', JSON.stringify({ locale: 'en' }))
    const { wrapper } = mountShell()
    expect(wrapper.get('[data-test="nav-config"]').text()).toBe('Config')
  })

  it('切换语言既改界面也记下来', async () => {
    const { wrapper, pinia } = mountShell()
    const ui = useUiStore(pinia)
    ui.setLocale('en')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="nav-config"]').text()).toBe('Config')
    expect(JSON.parse(localStorage.getItem('kestrel-ui') ?? '{}').locale).toBe('en')
  })

  it('主题按钮在白天/黑夜之间切换', async () => {
    const { wrapper, pinia } = mountShell()
    const ui = useUiStore(pinia)
    expect(ui.theme).toBe('kestrelDark')

    await wrapper.get('[data-test="theme-toggle"]').trigger('click')
    expect(ui.theme).toBe('kestrelLight')

    await wrapper.get('[data-test="theme-toggle"]').trigger('click')
    expect(ui.theme).toBe('kestrelDark')
  })
})
