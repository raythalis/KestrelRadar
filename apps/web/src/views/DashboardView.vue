<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

onMounted(() => {
  if (!store.snapshot) void store.load()
})
</script>

<template>
  <div>
    <h2 class="text-h6 mb-1">{{ t('nav.dashboard') }}</h2>
    <p class="text-body-2 text-medium-emphasis" data-test="dashboard-note">
      {{ t('placeholder.dashboard') }}
    </p>
    <div class="d-flex flex-wrap ga-2 mt-4" data-test="dashboard-counts">
      <v-chip label>{{ t('column.discoveries') }} {{ store.counts.discoveries }}</v-chip>
      <v-chip label>{{ t('column.monitors') }} {{ store.counts.monitors }}</v-chip>
      <v-chip label>{{ t('column.actions') }} {{ store.counts.actions }}</v-chip>
      <v-chip label>{{ t('nav.channels') }} {{ store.counts.channels }}</v-chip>
    </div>
  </div>
</template>
