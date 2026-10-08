import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import vuetify from '@/plugins/vuetify'
import AppHeader from '@/components/app/AppHeader.vue'
import AppSidebar from '@/components/app/AppSidebar.vue'
import type { AppNavItem } from '@/components/app/types'

const Empty = { template: '<div />' }

const items: AppNavItem[] = [
  { name: 'dashboard', icon: 'mdi-view-dashboard-outline', label: '仪表盘' },
  { name: 'config', icon: 'mdi-tune-variant', label: '配置管理' },
]

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: Empty },
      { path: '/config', name: 'config', component: Empty },
    ],
  })
}

function mountSidebar(open = false) {
  const router = buildRouter()
  return {
    router,
    wrapper: mount(AppSidebar, {
      props: { items, open, brand: { name: 'Kestrel Radar' } },
      global: { plugins: [createPinia(), vuetify, router] },
    }),
  }
}

describe('AppSidebar', () => {
  it('导航就是一份条目，窄屏靠抽屉，不再有底部导航条', () => {
    const { wrapper } = mountSidebar()
    expect(wrapper.findAll('.k2-nav__item')).toHaveLength(2)
    expect(wrapper.find('.k2-tabbar').exists()).toBe(false)
    expect(wrapper.get('[data-test="nav-config"]').text()).toContain('配置管理')
  })

  it('当前路由高亮，切页跟着变', async () => {
    const { wrapper, router } = mountSidebar()
    await router.push('/')
    await router.isReady()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="nav-dashboard"]').classes()).toContain('is-active')
    await router.push({ name: 'config' })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="nav-config"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-test="nav-dashboard"]').classes()).not.toContain('is-active')
  })

  it('抽屉展开时显示左栏与遮罩，点遮罩收起', async () => {
    const { wrapper } = mountSidebar(true)
    expect(wrapper.find('.k2-nav.is-open').exists()).toBe(true)
    expect(wrapper.find('[data-test="drawer-scrim"]').exists()).toBe(true)
    await wrapper.get('[data-test="drawer-scrim"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('收着的时候没有遮罩', () => {
    expect(mountSidebar(false).wrapper.find('[data-test="drawer-scrim"]').exists()).toBe(false)
  })
})

function mountHeader(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AppHeader, { props, slots, global: { plugins: [vuetify] } })
}

describe('AppHeader', () => {
  it('顶栏不显示页名（页名归页面自己那份页头）', () => {
    expect(mountHeader().find('[data-test="page-title"]').exists()).toBe(false)
  })

  it('菜单按钮把事件抛给外壳', async () => {
    const wrapper = mountHeader()
    await wrapper.get('[data-test="drawer-toggle"]').trigger('click')
    expect(wrapper.emitted('toggle-menu')).toHaveLength(1)
  })

  it('右侧操作区放什么都行（现在放的是主题切换）', () => {
    const wrapper = mountHeader({}, { actions: '<button>EN</button>' })
    expect(wrapper.get('.k2-shell__actions').text()).toContain('EN')
  })
})
