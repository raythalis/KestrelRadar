<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { API_BASE } from '@/api/http'
import type { AppLocale } from '@/plugins/i18n'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()

const version = __APP_VERSION__
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold">{{ t('settings.title') }}</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ t('settings.subtitle') }}</p>

    <v-card max-width="640">
      <v-card-text>
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">{{ t('settings.theme') }}</div>
          <v-btn-toggle
            :model-value="ui.theme"
            mandatory
            density="comfortable"
            @update:model-value="(value) => ui.setTheme(value as 'kestrelLight' | 'kestrelDark')"
          >
            <v-btn value="kestrelLight" prepend-icon="mdi-weather-sunny">
              {{ t('settings.themeLight') }}
            </v-btn>
            <v-btn value="kestrelDark" prepend-icon="mdi-weather-night">
              {{ t('settings.themeDark') }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">{{ t('settings.language') }}</div>
          <v-btn-toggle
            :model-value="ui.locale"
            mandatory
            density="comfortable"
            @update:model-value="(value) => ui.setLocale(value as AppLocale)"
          >
            <v-btn value="zh-CN">简体中文</v-btn>
            <v-btn value="en">English</v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-text>
        <div class="text-subtitle-2 mb-2">{{ t('settings.runtime') }}</div>
        <v-list density="compact">
          <v-list-item :title="t('settings.apiBase')" :subtitle="API_BASE" />
          <v-list-item :title="t('settings.frontendVersion')" :subtitle="version" />
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>
