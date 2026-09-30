<script setup lang="ts">
import type { Monitor } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ monitor: Monitor }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const store = useConfigStore()
const { t } = useI18n()

/** 跟随全局时，把当前真正生效的模式也写出来，别让人猜 */
const modeLabel = computed(() =>
  props.monitor.mode === 'follow_global'
    ? `${t('monitor.mode.follow_global')} · ${t('monitor.nowIs')}${t(`monitor.mode.${store.settings.judgeMode}`)}`
    : t(`monitor.mode.${props.monitor.mode}`),
)
const sensitivityLabel = computed(() => t(`monitor.sensitivity.${props.monitor.sensitivity}`))
const matchModeLabel = computed(() => t(`monitor.matchMode.${props.monitor.matchMode}`))

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
  <v-card class="entity-card entity-card--monitor pa-3" data-test="monitor-card">
    <div class="d-flex align-center ga-2">
      <span class="entity-card__title text-truncate" data-test="monitor-name">
        {{ monitor.name }}
      </span>
      <v-chip
        v-if="boundActions"
        size="x-small"
        color="accent"
        variant="tonal"
        data-test="monitor-bound"
      >
        {{ t('monitor.onlyActions', { names: boundActions }) }}
      </v-chip>
      <v-spacer />
      <v-switch
        :model-value="monitor.enabled"
        data-test="monitor-enabled"
        @update:model-value="(value) => store.setMonitorEnabled(monitor.id, Boolean(value))"
      />
    </div>

    <div class="entity-meta" data-test="monitor-mode">
      {{ modeLabel }} · {{ sensitivityLabel }} · {{ matchModeLabel }}
    </div>

    <div class="d-flex flex-wrap ga-1 mt-2" data-test="monitor-keywords">
      <v-chip
        v-for="keyword in monitor.includeKeywords"
        :key="keyword"
        size="x-small"
        label
        variant="tonal"
      >
        {{ keyword }}
      </v-chip>
      <span v-if="monitor.includeKeywords.length === 0" class="entity-meta entity-meta--faint">
        {{ t('monitor.noKeywords') }}
      </span>
    </div>

    <div class="d-flex align-center ga-1 mt-2">
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
