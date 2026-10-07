<!-- 外壳：只负责组织 AppSidebar + AppHeader + 内容区，自己不写样式。
     桌面是浮起的侧栏卡片（可收起），窄屏是抽屉导航 + 底部导航；顶栏右侧只有主题切换。
     页名不归顶栏（页名归页面自己那份页头），语言切换在设置页。
     v2 的 CSS 变量（--k2-*）在这里挂到 <html> 上：v2 的页面、弹窗、抽屉才都拿得到。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { BRAND_LOGO, BRAND_LOGO_DARK } from '@/brand'
import type { AppNavItem } from '@/components/app/types'
import ToastHost from '@/components/biz/ToastHost.vue'
import { THEME_PREFERENCES, applyV2Theme, type ThemePreference } from '@/design/v2/tokens'
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
const content = ref<HTMLElement | null>(null)

const navItems = computed<AppNavItem[]>(() =>
  NAV.map((item) => ({ ...item, label: t(`nav.${item.name}`) })),
)

// 版本号不放侧栏（后续挪进设置页展示），这里只出名字与品牌标
const brand = computed(() => ({
  name: t('app.name'),
  logo: ui.isDark ? BRAND_LOGO_DARK : BRAND_LOGO,
  mark: ui.isDark ? "/kestrel-mark-dark.svg" : "/kestrel-mark-light.svg",
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

// 界面语言以 store 为准（它管着持久化）：刷新后也要把存着的语言装回去。
// <html lang> 跟着一起改：读屏软件按它决定用哪种语音念，别停在 index.html 里那个 zh-CN。
watch(
  () => ui.locale,
  (next) => {
    locale.value = next
    document.documentElement.lang = next
  },
  { immediate: true },
)

// 主题：Vuetify 那边由 <v-app :theme> 管；这里把 CSS 变量挂到 <html> 上——
// 唯一一份 token（--k2-*）加上兼容别名（--k-* → var(--k2-*)），
// 弹窗、抽屉这些 teleport 出去的浮层也才跟着换色。
watch(
  () => ui.theme,
  () => applyV2Theme(ui.isDark),
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

// 宽窄切换时把抽屉状态归位：桌面本来就没有抽屉，窄屏进来也默认是关的
let narrowMedia: MediaQueryList | undefined
function onNarrowChange(): void {
  drawerOpen.value = false
}

// 窄屏判定用 1183：桌面档从 1184 起，那上面展开侧栏也留得住 900 的内容宽度
const NARROW_QUERY = '(max-width: 1183px)'

onMounted(() => {
  narrowMedia = window.matchMedia?.(NARROW_QUERY)
  narrowMedia?.addEventListener('change', onNarrowChange)
})

onUnmounted(() => {
  narrowMedia?.removeEventListener('change', onNarrowChange)
})

// 换页就把抽屉收起来，并把内容区滚回顶部（滚动容器是内容区，不是文档）
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
    content.value?.scrollTo({ top: 0 })
  },
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') drawerOpen.value = false
}
</script>

<template>
  <v-app :theme="ui.theme">
    <div
      class="k2-shell k2-shell--app"
      :class="{ 'k2-shell--rail': ui.sidebarCollapsed, 'has-drawer-open': drawerOpen }"
      @keydown="onKeydown"
    >
      <AppSidebar
        :items="navItems"
        :open="drawerOpen"
        :brand="brand"
        :close-label="t('nav.closeMenu')"
        :expand-label="t('nav.expand')"
        :collapse-label="t('nav.collapse')"
        @close="drawerOpen = false"
      />

      <AppHeader :menu-label="t('nav.openMenu')" @toggle-menu="drawerOpen = !drawerOpen">
        <template #actions>
          <button
            type="button"
            class="k2-iconbtn"
            data-test="theme-toggle"
            :title="t(currentTheme.labelKey)"
            :aria-label="t(currentTheme.labelKey)"
            @click="onThemeClick"
          >
            <v-icon size="20">{{ currentTheme.icon }}</v-icon>
          </button>
        </template>
      </AppHeader>

      <div ref="content" class="k2-shell__content" data-test="shell-body">
        <router-view />
      </div>

      <ToastHost />
    </div>
  </v-app>
</template>
