<script setup lang="ts">
import type { Action } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ action: Action }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const triggerLabel = computed(() => t(`action.trigger.${props.action.triggerType}`))
const channel = computed(() => store.channelName(props.action.channelId))
const referencedBy = computed(() => store.monitorNamesUsingAction(props.action.id))
</script>

<template>
  <v-card variant="tonal" class="pa-3" data-test="action-card">
    <div class="d-flex align-center ga-2">
      <span class="text-body-2 font-weight-medium text-truncate" data-test="action-name">
        {{ action.name }}
      </span>
      <v-spacer />
      <v-switch
        :model-value="action.enabled"
        color="primary"
        density="compact"
        hide-details
        data-test="action-enabled"
        @update:model-value="(value) => store.setActionEnabled(action.id, Boolean(value))"
      />
    </div>

    <div class="text-caption text-medium-emphasis" data-test="action-trigger">
      {{ triggerLabel
      }}<template v-if="action.triggerType === 'digest'"> · {{ action.cronExpression }}</template>
    </div>

    <div class="text-caption" data-test="action-channel">
      {{ t('action.channel') }}{{ channel || t('action.channelMissing') }}
    </div>
    <v-alert
      v-if="!channel"
      type="warning"
      variant="tonal"
      density="compact"
      class="mt-2 text-caption"
      data-test="action-warning"
    >
      {{ t('action.channelMissingHint') }}
    </v-alert>

    <div class="text-caption text-medium-emphasis" data-test="action-referenced">
      {{ t('action.referencedBy', { n: referencedBy.length }) }}
    </div>

    <div class="d-flex align-center ga-2 mt-2">
      <v-btn
        size="x-small"
        variant="text"
        icon="mdi-pencil"
        data-test="action-edit"
        @click="emit('edit')"
      />
      <v-spacer />
      <v-btn
        size="x-small"
        variant="text"
        color="error"
        icon="mdi-delete"
        data-test="action-delete"
        @click="emit('delete')"
      />
    </div>
  </v-card>
</template>
