<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify'

import { THEMES, applyThemeVars, findTheme } from '@/design/tokens'
import type { AppLocale } from '@/plugins/i18n'
import type { AppTheme } from '@/stores/ui'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const theme = useTheme()
const route = useRoute()
const { t, locale } = useI18n()

const localeOptions: { value: AppLocale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

const navItems: { name: string; icon: string }[] = [
  { name: 'dashboard', icon: 'mdi-view-dashboard-outline' },
  { name: 'config', icon: 'mdi-tune-variant' },
  { name: 'channels', icon: 'mdi-bell-outline' },
  { name: 'models', icon: 'mdi-robot-outline' },
  { name: 'settings', icon: 'mdi-cog-outline' },
]

const currentTitle = computed(() => t(`nav.${String(route.name ?? 'dashboard')}`))

// 界面语言以 store 为准（它管着持久化）：刷新后也要把存着的语言装回去
watch(
  () => ui.locale,
  (next) => (locale.value = next),
  { immediate: true },
)

// 主题：Vuetify 主题 + CSS 变量（--k-*）一起换；变量挂在 <html> 上，弹窗也才不掉色
watch(
  () => ui.theme,
  (next) => {
    theme.global.name.value = next
    const definition = findTheme(next)
    if (definition) applyThemeVars(definition)
  },
  { immediate: true },
)

function setTheme(next: AppTheme): void {
  ui.setTheme(next)
}

function changeLocale(next: AppLocale): void {
  ui.setLocale(next)
}
</script>

<template>
  <v-app :theme="ui.theme">
    <div class="k-shell">
      <aside class="k-rail">
        <div class="k-rail__brand">
          <div class="brand-mark">K</div>
          <div>
            <div class="k-rail__name" data-test="app-name">{{ t('app.name') }}</div>
            <div class="k-rail__tagline">{{ t('app.tagline') }}</div>
          </div>
        </div>

        <div class="k-rail__label">{{ t('nav.sectionMain') }}</div>
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="k-rail__item"
          :class="{ 'is-active': route.name === item.name }"
          :data-test="`nav-${item.name}`"
        >
          <v-icon size="18">{{ item.icon }}</v-icon>
          <span>{{ t(`nav.${item.name}`) }}</span>
        </router-link>
      </aside>

      <main class="k-main">
        <header class="k-topbar">
          <div class="k-crumb">
            <span>{{ t('app.name') }}</span>
            <span>/</span>
            <b data-test="page-title">{{ currentTitle }}</b>
          </div>
          <div class="k-spacer" />
          <div class="k-seg">
            <button
              v-for="option in THEMES"
              :key="option.id"
              type="button"
              :class="{ on: ui.theme === option.id }"
              :data-test="`theme-${option.id}`"
              @click="setTheme(option.id)"
            >
              {{ t(option.labelKey) }}
            </button>
          </div>
          <v-select
            :model-value="ui.locale"
            :items="localeOptions"
            item-title="label"
            item-value="value"
            density="compact"
            hide-details
            variant="outlined"
            class="k-topbar__locale"
            data-test="locale-select"
            @update:model-value="changeLocale"
          />
        </header>

        <div class="k-main__inner" data-test="shell-body">
          <router-view />
        </div>
      </main>
    </div>
  </v-app>
</template>
