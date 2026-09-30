<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'

import type { AppLocale } from '@/plugins/i18n'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const theme = useTheme()
const { t, locale } = useI18n()

const localeOptions: { value: AppLocale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

function toggleTheme() {
  ui.toggleTheme()
  theme.global.name.value = ui.theme
}

function changeLocale(next: AppLocale) {
  ui.setLocale(next)
  locale.value = next
}
</script>

<template>
  <v-app :theme="ui.theme">
    <v-app-bar flat border>
      <v-app-bar-title data-test="app-name">{{ t('app.name') }}</v-app-bar-title>
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
        @update:model-value="changeLocale"
      />
      <v-btn
        :icon="ui.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        @click="toggleTheme"
      />
    </v-app-bar>

    <v-main>
      <v-container class="py-8" data-test="shell-body">
        <h2 class="text-h6 mb-2">{{ t('app.tagline') }}</h2>
        <p class="text-body-2 text-medium-emphasis">{{ t('shell.note') }}</p>
      </v-container>
    </v-main>
  </v-app>
</template>
