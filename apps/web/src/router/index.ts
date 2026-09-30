import { createRouter, createWebHistory } from 'vue-router'

import ConfigView from '@/views/ConfigView.vue'
import DashboardView from '@/views/DashboardView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'

// 路由表：仪表盘与配置管理已接入；渠道 / 模型 / 设置先占位。
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/config', name: 'config', component: ConfigView },
    {
      path: '/channels',
      name: 'channels',
      component: PlaceholderView,
      meta: { titleKey: 'nav.channels', noteKey: 'placeholder.channels' },
    },
    {
      path: '/models',
      name: 'models',
      component: PlaceholderView,
      meta: { titleKey: 'nav.models', noteKey: 'placeholder.models' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: PlaceholderView,
      meta: { titleKey: 'nav.settings', noteKey: 'placeholder.settings' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
