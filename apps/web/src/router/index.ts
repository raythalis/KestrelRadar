import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { titleKey: 'nav.dashboard', icon: 'mdi-view-dashboard-outline' },
    },
    {
      path: '/groups',
      name: 'groups',
      component: () => import('@/views/GroupsView.vue'),
      meta: { titleKey: 'nav.groups', icon: 'mdi-folder-multiple-outline' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { titleKey: 'nav.settings', icon: 'mdi-cog-outline' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
