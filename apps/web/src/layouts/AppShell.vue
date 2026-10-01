<!-- 外壳：桌面左侧导航 + 顶栏；窄屏是抽屉导航 + 底部五个 tab。
     内容区全宽，不设最大宽度（之前限过 1320px，右侧会留白，已去掉）。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { THEME_PREFERENCES, applyThemeVars, findTheme, type ThemePreference } from '@/design/tokens'
import type { AppLocale } from '@/plugins/i18n'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const route = useRoute()
const { t, locale } = useI18n()

const navItems: { name: string; icon: string }[] = [
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

const currentName = computed(() => String(route.name ?? 'dashboard'))
// 开发用的 /design 不在产品导航里，标题单独给一个（它不在 locales 里，不该为它加产品文案）
const currentTitle = computed(() =>
  route.meta.devOnly ? 'Design System' : t(`nav.${currentName.value}`),
)
const drawerOpen = ref(false)

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
    <div class="k-shell" @keydown="onKeydown">
      <button
        v-if="drawerOpen"
        type="button"
        class="k-scrim"
        data-test="drawer-scrim"
        :aria-label="t('nav.closeMenu')"
        @click="drawerOpen = false"
      />

      <aside class="k-rail" :class="{ 'is-open': drawerOpen }">
        <div class="k-rail__brand">
          <span class="k-rail__name" data-test="app-name">{{ t('app.name') }}</span>
          <span class="k-rail__tagline">{{ t('app.tagline') }}</span>
        </div>

        <nav class="k-rail__nav">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="k-rail__item"
            :class="{ 'is-active': currentName === item.name }"
            :data-test="`nav-${item.name}`"
          >
            <v-icon size="18">{{ item.icon }}</v-icon>
            <span>{{ t(`nav.${item.name}`) }}</span>
          </router-link>
        </nav>
      </aside>

      <main class="k-main">
        <header class="k-topbar">
          <button
            type="button"
            class="k-iconbtn"
            data-test="drawer-toggle"
            :aria-label="t('nav.openMenu')"
            @click="drawerOpen = !drawerOpen"
          >
            <v-icon size="18">mdi-menu</v-icon>
          </button>

          <span class="k-topbar__title" data-test="page-title">{{ currentTitle }}</span>
          <span class="k-spacer" />

          <button type="button" class="k-langbtn" data-test="locale-btn" @click="changeLocale">
            {{ ui.locale === 'zh-CN' ? 'EN' : '中文' }}
          </button>

          <div class="k-seg" data-test="theme-seg">
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
        </header>

        <div class="k-main__inner" data-test="shell-body">
          <router-view />
        </div>
      </main>

      <nav class="k-tabbar">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="k-tabbar__item"
          :class="{ 'is-active': currentName === item.name }"
          :data-test="`tab-${item.name}`"
        >
          <v-icon size="18">{{ item.icon }}</v-icon>
          <span>{{ t(`nav.${item.name}`) }}</span>
        </router-link>
      </nav>
    </div>
  </v-app>
</template>
