<!-- 外壳：只负责组织 AppSidebar + AppHeader + 内容区，自己不写样式。
     桌面是常驻左栏，窄屏是抽屉导航 + 底部导航；顶栏管当前页标题、语言与主题三态。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import type { AppNavItem } from '@/components/app/types'
import { THEME_PREFERENCES, applyThemeVars, findTheme, type ThemePreference } from '@/design/tokens'
import type { AppLocale } from '@/plugins/i18n'
import { useUiStore } from '@/stores/ui'

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

const currentName = computed(() => String(route.name ?? 'dashboard'))
// 开发用的 /design 不在产品导航里，标题单独给一个（它不在 locales 里，不该为它加产品文案）
const currentTitle = computed(() =>
  route.meta.devOnly ? 'Design System' : t(`nav.${currentName.value}`),
)

const brand = computed(() => ({ name: t('app.name'), tagline: t('app.tagline') }))

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

function changeLocale(): void {
  const next: AppLocale = ui.locale === 'zh-CN' ? 'en' : 'zh-CN'
  ui.setLocale(next)
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
        <AppHeader
          :title="currentTitle"
          :menu-label="t('nav.openMenu')"
          @toggle-menu="drawerOpen = !drawerOpen"
        >
          <template #actions>
            <button type="button" class="app-langbtn" data-test="locale-btn" @click="changeLocale">
              {{ ui.locale === 'zh-CN' ? 'EN' : '中文' }}
            </button>

            <div class="app-seg" data-test="theme-seg">
              <button
                v-for="option in THEME_PREFERENCES"
                :key="option.value"
                type="button"
                :class="{ on: ui.preference === option.value }"
                :data-test="`theme-${option.value}`"
                :title="t(option.labelKey)"
                :aria-label="t(option.labelKey)"
                @click="ui.setPreference(option.value)"
              >
                <v-icon size="14">{{ themeIcons[option.value] }}</v-icon>
              </button>
            </div>
          </template>
        </AppHeader>

        <div class="app-shell__content" data-test="shell-body">
          <router-view />
        </div>
      </main>
    </div>
  </v-app>
</template>
