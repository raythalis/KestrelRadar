import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import ChannelsView from '@/views/ChannelsView.vue'
import ConfigView from '@/views/ConfigView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ModelsView from '@/views/ModelsView.vue'
import SettingsView from '@/views/SettingsView.vue'

// 产品路由：仪表盘（v1.0 占位）之外，其余四页都接了真实接口。
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/config', name: 'config', component: ConfigView },
  { path: '/channels', name: 'channels', component: ChannelsView },
  { path: '/models', name: 'models', component: ModelsView },
  { path: '/settings', name: 'settings', component: SettingsView },
]

// 开发预览页只在开发环境注册：生产构建里 import.meta.env.DEV 是 false，这段连同它的 chunk 一起被删掉。
if (import.meta.env.DEV) {
  // /style-lab 是视觉方向 v2 的并行预览页，只在开发环境注册。
  // 它自带 styles/v2.scss，样式收在 .k2 作用域内，不参与产品样式表。
  routes.push({
    path: '/style-lab',
    name: 'style-lab',
    component: () => import('@/views/StyleLabView.vue'),
    meta: { devOnly: true },
  })
}

routes.push({ path: '/:pathMatch(.*)*', redirect: '/' })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
