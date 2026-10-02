<!-- 外壳：只负责组织 AppSidebar + AppHeader + 内容区，自己不写样式。
     桌面是常驻左栏，窄屏是抽屉导航 + 底部导航；顶栏右侧只有主题切换。
     页名不归顶栏（那是页面自己 AppPage 的事），语言切换在设置页。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { BRAND_LOGO } from '@/brand'
import type { AppNavItem } from '@/components/app/types'
import { THEME_PREFERENCES, applyThemeVars, findTheme, type ThemePreference } from '@/design/tokens'
import { useUiStore } from '@/stores/ui'
import { applyThemeWithReveal } from '@/utils/theme-reveal'

const NAV: { name: string; icon: string }[] = [
  { name: 'dashboard', icon: 'mdi-view-dashboard-outline' },
  { name: 'config', icon: 'mdi-tune-variant' },
  { name: 'channels', icon: 'mdi-bell-outline' },
  { name: 'models', icon: 'mdi-robot-outline' },
  { name: 'settings', icon: 'mdi-cog-outline' },
]

const themeIcons: Record<ThemePreference, string> = {
  light: 'mdi-weather-sunny',
  system: 'mdi-monitor',
  dark: 'mdi-weather-night',
}

const ui = useUiStore()
const route = useRoute()
const { t, locale } = useI18n()

const drawerOpen = ref(false)

const navItems = computed<AppNavItem[]>(() =>
  NAV.map((item) => ({ ...item, label: t(`nav.${item.name}`) })),
)

const brand = computed(() => ({
  name: t('app.name'),
  tagline: t('app.tagline'),
  logo: BRAND_LOGO,
}))

// 顶栏只有一个主题按钮：图标显示当前模式，点一下循环到下一个
const currentTheme = computed(() => {
  const option = THEME_PREFERENCES.find((item) => item.value === ui.preference)
  return {
    icon: themeIcons[option?.value ?? 'system'],
    labelKey: option?.labelKey ?? 'theme.system',
  }
})

/** 以点击位置为中心扩散换主题（不支持 View Transitions 时直接换） */
function onThemeClick(event: MouseEvent): void {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  applyThemeWithReveal(
    {
      x: event.clientX || rect.left + rect.width / 2,
      y: event.clientY || rect.top + rect.height / 2,
    },
    () => ui.cyclePreference(),
  )
}

// 界面语言以 store 为准（它管着持久化）：刷新后也要把存着的语言装回去
watch(
  () => ui.locale,
  (next) => (locale.value = next),
  { immediate: true },
)

// 主题：Vuetify 那边由 <v-app :theme> 管；这里负责把 CSS 变量（--k-*）挂到 <html> 上，
// 弹窗、抽屉这些 teleport 出去的浮层也才跟着换色。
watch(
  () => ui.theme,
  (next) => {
    const definition = findTheme(next)
    if (definition) applyThemeVars(definition)
  },
  { immediate: true },
)

// 跟随系统时，系统亮暗变了要跟上
let media: MediaQueryList | undefined
function onSystemTheme(event: MediaQueryListEvent): void {
  ui.syncSystemTheme(event.matches)
}

onMounted(() => {
  media = window.matchMedia?.('(prefers-color-scheme: dark)')
  media?.addEventListener('change', onSystemTheme)
})

onUnmounted(() => {
  media?.removeEventListener('change', onSystemTheme)
})

// 换页就把抽屉收起来
watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') drawerOpen.value = false
}
</script>

<template>
  <v-app :theme="ui.theme">
    <div class="app-shell" :class="{ 'has-drawer-open': drawerOpen }" @keydown="onKeydown">
      <AppSidebar
        :items="navItems"
        :open="drawerOpen"
        :brand="brand"
        :close-label="t('nav.closeMenu')"
        @close="drawerOpen = false"
      />

      <main class="app-shell__main">
        <AppHeader :menu-label="t('nav.openMenu')" @toggle-menu="drawerOpen = !drawerOpen">
          <template #actions>
            <button
              type="button"
              class="app-iconbtn"
              data-test="theme-toggle"
              :title="t(currentTheme.labelKey)"
              :aria-label="t(currentTheme.labelKey)"
              @click="onThemeClick"
            >
              <v-icon size="18">{{ currentTheme.icon }}</v-icon>
            </button>
          </template>
        </AppHeader>

        <div class="app-shell__content" data-test="shell-body">
          <router-view />
        </div>
      </main>
    </div>
  </v-app>
</template>
