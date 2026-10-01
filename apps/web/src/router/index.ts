import { createRouter, createWebHistory } from 'vue-router'

import ChannelsView from '@/views/ChannelsView.vue'
import ConfigView from '@/views/ConfigView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ModelsView from '@/views/ModelsView.vue'
import SettingsView from '@/views/SettingsView.vue'

// 路由表：仪表盘（v1.0 占位）之外，其余四页都接了真实接口。
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/config', name: 'config', component: ConfigView },
    { path: '/channels', name: 'channels', component: ChannelsView },
    { path: '/models', name: 'models', component: ModelsView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
