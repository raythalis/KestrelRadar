import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '@/stores/ui'
import { createMemoryHistory, createRouter } from 'vue-router'

import { BRAND_LOGO } from '@/brand'
import AppShell from '@/layouts/AppShell.vue'
// App* 组件是全局注册的，挂载外壳也要带上这个插件
import appComponents from '@/plugins/components'
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
      global: { plugins: [pinia, vuetify, i18n, router, appComponents] },
    }),
  }
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'zh-CN'
  })

  it('渲染品牌标、应用名与五个导航入口', () => {
    const { wrapper } = mountShell()
    expect(wrapper.get('[data-test="app-name"]').text()).toContain('Kestrel')
    // 品牌标走 brand.ts 的路径；换 logo 只改那一处
    expect(wrapper.get('[data-test="app-logo"]').attributes('src')).toBe(BRAND_LOGO)
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

  it('顶栏的三态主题段控件能换主题并记下来', async () => {
    const { wrapper, pinia } = mountShell()
    const ui = useUiStore(pinia)
    expect(ui.preference).toBe('system')
    expect(ui.theme).toBe('kestrelLight')

    await wrapper.get('[data-test="theme-dark"]').trigger('click')
    expect(ui.preference).toBe('dark')
    expect(ui.theme).toBe('kestrelDark')
    expect(JSON.parse(localStorage.getItem('kestrel-ui') ?? '{}').theme).toBe('dark')

    await wrapper.get('[data-test="theme-light"]').trigger('click')
    expect(ui.theme).toBe('kestrelLight')
  })

  it('窄屏底部导航有五个入口，抽屉默认收着', async () => {
    const { wrapper } = mountShell()
    for (const name of ['dashboard', 'config', 'channels', 'models', 'settings']) {
      expect(wrapper.find(`[data-test="tab-${name}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('.app-rail.is-open').exists()).toBe(false)

    await wrapper.get('[data-test="drawer-toggle"]').trigger('click')
    expect(wrapper.find('.app-rail.is-open').exists()).toBe(true)
    expect(wrapper.find('[data-test="drawer-scrim"]').exists()).toBe(true)

    await wrapper.get('[data-test="drawer-scrim"]').trigger('click')
    expect(wrapper.find('.app-rail.is-open').exists()).toBe(false)
  })

  it('顶栏面包屑跟着当前路由走', async () => {
    const { wrapper, router } = mountShell()
    expect(wrapper.get('[data-test="page-title"]').text()).toBe('仪表盘')
    await router.push({ name: 'settings' })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="page-title"]').text()).toBe('设置')
  })
})
