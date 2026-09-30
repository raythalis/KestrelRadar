<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

onMounted(() => {
  if (!store.snapshot) void store.load()
})

const stats = [
  { key: 'discoveries', icon: 'mdi-rss', labelKey: 'column.discoveries' },
  { key: 'monitors', icon: 'mdi-filter-variant', labelKey: 'column.monitors' },
  { key: 'actions', icon: 'mdi-send', labelKey: 'column.actions' },
  { key: 'channels', icon: 'mdi-broadcast', labelKey: 'nav.channels' },
] as const
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-head__title">{{ t('nav.dashboard') }}</h2>
        <p class="page-head__note" data-test="dashboard-note">{{ t('placeholder.dashboard') }}</p>
      </div>
    </div>

    <v-row density="compact" data-test="dashboard-counts">
      <v-col v-for="item in stats" :key="item.key" cols="6" md="3">
        <v-card class="pa-4" variant="outlined" style="border-color: var(--k-border)">
          <div class="d-flex align-center ga-2 entity-meta">
            <v-icon size="16" :icon="item.icon" />
            <span>{{ t(item.labelKey) }}</span>
          </div>
          <div class="text-h5 font-weight-bold mt-2">
            {{ store.counts[item.key] }}
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
