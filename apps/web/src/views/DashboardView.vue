<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useWorkspaceStore } from '@/stores/workspace'

const { t } = useI18n()
const workspace = useWorkspaceStore()

const stats = computed(() => [
  {
    key: 'groups',
    label: t('dashboard.stats.groups'),
    value: workspace.summary.groups,
    icon: 'mdi-folder-multiple-outline',
  },
  {
    key: 'sources',
    label: t('dashboard.stats.sources'),
    value: workspace.summary.sources,
    icon: 'mdi-rss',
  },
  {
    key: 'watchers',
    label: t('dashboard.stats.watchers'),
    value: workspace.summary.watchers,
    icon: 'mdi-eye-outline',
  },
  {
    key: 'actions',
    label: t('dashboard.stats.actions'),
    value: workspace.summary.actions,
    icon: 'mdi-send-outline',
  },
])
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold">{{ t('dashboard.title') }}</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ t('dashboard.subtitle') }}</p>

    <v-alert
      class="mb-4"
      :type="workspace.dataSource === 'api' ? 'success' : 'warning'"
      variant="tonal"
      density="comfortable"
    >
      {{ workspace.dataSource === 'api' ? t('datasource.apiHint') : t('datasource.sampleHint') }}
      <div v-if="workspace.lastError" class="text-caption mt-1">
        {{ t('datasource.loadFailed', { message: workspace.lastError }) }}
      </div>
    </v-alert>

    <v-row dense>
      <v-col v-for="stat in stats" :key="stat.key" cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <v-icon :icon="stat.icon" size="32" class="me-3 text-medium-emphasis" />
            <div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              <div class="text-h5">{{ stat.value }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-6">
      <v-card-title>{{ t('nav.groups') }}</v-card-title>
      <v-table v-if="workspace.groups.length">
        <thead>
          <tr>
            <th class="text-left">{{ t('dashboard.groupsTable.name') }}</th>
            <th class="text-left">{{ t('dashboard.groupsTable.cards') }}</th>
            <th class="text-left">{{ t('dashboard.groupsTable.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in workspace.groups" :key="group.id">
            <td>
              <router-link class="text-decoration-none" :to="{ name: 'groups' }">
                {{ group.name }}
              </router-link>
              <div class="text-caption text-medium-emphasis">{{ group.description }}</div>
            </td>
            <td>{{ group.cards.length }}</td>
            <td>
              <v-chip size="small" :color="group.enabled ? 'success' : 'default'" variant="tonal">
                {{ group.enabled ? t('common.enabled') : t('common.disabled') }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text v-else class="text-medium-emphasis">{{ t('dashboard.empty') }}</v-card-text>
    </v-card>
  </div>
</template>
