<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify'

import type { AppLocale } from '@/plugins/i18n'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const theme = useTheme()
const route = useRoute()
const { t, locale } = useI18n()

const localeOptions: { value: AppLocale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

const navItems = ['dashboard', 'config', 'channels', 'models', 'settings'] as const

function toggleTheme(): void {
  ui.toggleTheme()
  theme.global.name.value = ui.theme
}

function changeLocale(next: AppLocale): void {
  ui.setLocale(next)
  locale.value = next
}
</script>

<template>
  <v-app :theme="ui.theme">
    <v-app-bar flat class="k-appbar" height="64">
      <div class="d-flex align-center ga-3 ml-4 mr-6">
        <div class="brand-mark">K</div>
        <div>
          <div
            class="text-body-1 font-weight-bold"
            style="letter-spacing: -0.01em"
            data-test="app-name"
          >
            {{ t('app.name') }}
          </div>
          <div class="text-caption" style="color: var(--k-faint); line-height: 1.1">
            {{ t('app.tagline') }}
          </div>
        </div>
      </div>

      <v-tabs :model-value="route.name" density="compact" align-tabs="start" slider-color="primary">
        <v-tab
          v-for="item in navItems"
          :key="item"
          :value="item"
          :to="{ name: item }"
          :data-test="`nav-${item}`"
        >
          {{ t(`nav.${item}`) }}
        </v-tab>
      </v-tabs>

      <v-spacer />
      <v-select
        :model-value="ui.locale"
        :items="localeOptions"
        item-title="label"
        item-value="value"
        density="compact"
        hide-details
        variant="solo-filled"
        flat
        class="mr-3"
        style="max-width: 150px"
        data-test="locale-select"
        @update:model-value="changeLocale"
      />
      <v-btn
        :icon="ui.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        class="mr-3"
        data-test="theme-toggle"
        @click="toggleTheme"
      />
    </v-app-bar>

    <v-main class="k-page">
      <v-container class="py-6" style="max-width: 1360px" data-test="shell-body">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>
