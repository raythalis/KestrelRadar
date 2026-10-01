<script setup lang="ts">
import type { Action } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'
import { templateDisplayName } from '@/utils/format'

const props = defineProps<{ action: Action }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const triggerLabel = computed(() => t(`action.trigger.${props.action.triggerType}`))
const channel = computed(() => store.channelName(props.action.channelId))
const templateName = computed(() => {
  const template = store.templateById(props.action.templateId)
  return template ? templateDisplayName(template, t) : t('action.templateBuiltin')
})
const referencedBy = computed(() => store.monitorNamesUsingAction(props.action.id))
</script>

<template>
  <v-card class="entity-card entity-card--action pa-3" data-test="action-card">
    <div class="d-flex align-center ga-2">
      <span class="entity-card__title text-truncate" data-test="action-name">{{
        action.name
      }}</span>
      <v-spacer />
      <v-switch
        :model-value="action.enabled"
        data-test="action-enabled"
        @update:model-value="(value) => store.setActionEnabled(action.id, Boolean(value))"
      />
    </div>

    <div class="entity-meta" data-test="action-trigger">
      {{ triggerLabel
      }}<template v-if="action.triggerType === 'digest'"> · {{ action.cronExpression }}</template>
    </div>
    <div class="entity-meta" data-test="action-channel">
      {{ t('action.channel') }}{{ channel || t('action.channelMissing') }}
    </div>
    <div class="entity-meta entity-meta--faint" data-test="action-template">
      {{ t('action.template') }}{{ templateName }}
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

    <div class="entity-meta entity-meta--faint mt-1" data-test="action-referenced">
      {{ t('action.referencedBy', { n: referencedBy.length }) }}
    </div>

    <div class="d-flex align-center ga-1 mt-2">
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
