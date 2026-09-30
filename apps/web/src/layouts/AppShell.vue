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
    <v-app-bar flat border>
      <v-app-bar-title data-test="app-name">{{ t('app.name') }}</v-app-bar-title>
      <v-tabs :model-value="route.name" density="compact" align-tabs="start" class="ml-4">
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
        class="mr-2"
        style="max-width: 150px"
        data-test="locale-select"
        @update:model-value="changeLocale"
      />
      <v-btn
        :icon="ui.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        data-test="theme-toggle"
        @click="toggleTheme"
      />
    </v-app-bar>

    <v-main>
      <v-container class="py-6" fluid data-test="shell-body">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>
