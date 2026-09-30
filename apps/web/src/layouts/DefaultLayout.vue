<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'

import type { AppLocale } from '@/plugins/i18n'
import { useUiStore } from '@/stores/ui'
import { useWorkspaceStore } from '@/stores/workspace'

const route = useRoute()
const display = useDisplay()
const theme = useTheme()
const ui = useUiStore()
const workspace = useWorkspaceStore()
const { t, locale } = useI18n()

const navItems = [
  { to: '/', key: 'nav.dashboard', icon: 'mdi-view-dashboard-outline' },
  { to: '/groups', key: 'nav.groups', icon: 'mdi-folder-multiple-outline' },
  { to: '/settings', key: 'nav.settings', icon: 'mdi-cog-outline' },
]

const localeOptions: { value: AppLocale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

// 桌面端抽屉常驻；移动端用汉堡按钮切换
const drawerOpen = ref(false)
const drawer = computed({
  get: () => display.mdAndUp.value || drawerOpen.value,
  set: (value: boolean) => {
    drawerOpen.value = value
  },
})

const pageTitle = computed(() => {
  const key = route.meta.titleKey as string | undefined
  return key ? t(key) : t('app.name')
})

const dataSourceLabel = computed(() =>
  workspace.dataSource === 'api' ? t('datasource.api') : t('datasource.sample'),
)

watch(
  () => ui.theme,
  (next) => {
    theme.global.name.value = next
  },
  { immediate: true },
)

watch(
  () => ui.locale,
  (next) => {
    locale.value = next
  },
  { immediate: true },
)

onMounted(() => {
  void workspace.load()
})
</script>

<template>
  <v-app>
    <v-app-bar flat density="comfortable" color="surface">
      <v-app-bar-nav-icon v-if="!display.mdAndUp.value" @click="drawer = !drawer" />
      <v-app-bar-title>
        <span class="font-weight-bold">{{ t('app.name') }}</span>
        <span class="text-medium-emphasis ms-2 text-body-2">{{ pageTitle }}</span>
      </v-app-bar-title>

      <v-chip
        class="me-2"
        size="small"
        variant="tonal"
        :color="workspace.dataSource === 'api' ? 'success' : 'warning'"
        :prepend-icon="
          workspace.dataSource === 'api' ? 'mdi-cloud-check-outline' : 'mdi-flask-outline'
        "
      >
        {{ dataSourceLabel }}
      </v-chip>

      <v-btn
        :icon="ui.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        @click="ui.toggleTheme()"
      />

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-translate" variant="text" />
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="option in localeOptions"
            :key="option.value"
            :active="ui.locale === option.value"
            @click="ui.setLocale(option.value)"
          >
            <v-list-item-title>{{ option.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" :permanent="display.mdAndUp.value" color="surface">
      <v-list nav density="comfortable">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="t(item.key)"
          exact
        />
      </v-list>
      <v-divider />
      <div class="pa-4 text-caption text-medium-emphasis">{{ t('app.tagline') }}</div>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>
