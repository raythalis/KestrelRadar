<script setup lang="ts">
import type { Monitor } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ monitor: Monitor }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const modeLabel = computed(() => t(`monitor.mode.${props.monitor.mode}`))
const sensitivityLabel = computed(() => t(`monitor.sensitivity.${props.monitor.sensitivity}`))
const matchModeLabel = computed(() => t(`monitor.matchMode.${props.monitor.matchMode}`))

/** 只有被限定过的监听才显示「仅走 X」 */
const boundActions = computed(() =>
  props.monitor.actionIds.length === 0
    ? ''
    : props.monitor.actionIds
        .map(
          (id) => store.actionsOf(props.monitor.groupId).find((action) => action.id === id)?.name,
        )
        .filter(Boolean)
        .join('、'),
)
</script>

<template>
  <v-card variant="tonal" class="pa-3" data-test="monitor-card">
    <div class="d-flex align-center ga-2">
      <span class="text-body-2 font-weight-medium text-truncate" data-test="monitor-name">
        {{ monitor.name }}
      </span>
      <v-chip v-if="boundActions" size="x-small" color="accent" data-test="monitor-bound">
        {{ t('monitor.onlyActions', { names: boundActions }) }}
      </v-chip>
      <v-spacer />
      <v-switch
        :model-value="monitor.enabled"
        color="primary"
        density="compact"
        hide-details
        data-test="monitor-enabled"
        @update:model-value="(value) => store.setMonitorEnabled(monitor.id, Boolean(value))"
      />
    </div>

    <div class="text-caption text-medium-emphasis" data-test="monitor-mode">
      {{ modeLabel }} · {{ sensitivityLabel }} · {{ matchModeLabel }}
    </div>

    <div class="d-flex flex-wrap ga-1 mt-1" data-test="monitor-keywords">
      <v-chip v-for="keyword in monitor.includeKeywords" :key="keyword" size="x-small" label>
        {{ keyword }}
      </v-chip>
      <span v-if="monitor.includeKeywords.length === 0" class="text-caption text-medium-emphasis">
        {{ t('monitor.noKeywords') }}
      </span>
    </div>

    <div class="d-flex align-center ga-2 mt-2">
      <v-btn
        size="x-small"
        variant="text"
        icon="mdi-pencil"
        data-test="monitor-edit"
        @click="emit('edit')"
      />
      <v-spacer />
      <v-btn
        size="x-small"
        variant="text"
        color="error"
        icon="mdi-delete"
        data-test="monitor-delete"
        @click="emit('delete')"
      />
    </div>
  </v-card>
</template>
