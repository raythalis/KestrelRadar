import { createRouter, createWebHistory } from 'vue-router'

// 路由表随界面阶段（M5）一起长；骨架期只有入口页。
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
