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
  <div
    class="k-item"
    :class="{ 'k-item--off': !action.enabled }"
    role="button"
    tabindex="0"
    data-test="action-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
  >
    <div class="k-item__top">
      <span class="k-tag k-tag--accent" data-test="action-trigger">{{ triggerLabel }}</span>
      <span v-if="action.triggerType === 'digest'" class="k-tag font-mono">
        {{ action.cronExpression }}
      </span>
      <span class="k-spacer" />
      <span @click.stop>
        <v-switch
          :model-value="action.enabled"
          :title="action.enabled ? t('common.enabled') : t('common.disabled')"
          data-test="action-enabled"
          @update:model-value="(value) => store.setActionEnabled(action.id, Boolean(value))"
        />
      </span>
    </div>

    <div class="k-item__title" data-test="action-name">{{ action.name }}</div>
    <div class="k-item__sub" data-test="action-channel">
      {{ t('action.channel') }}{{ channel || t('action.channelMissing') }}
    </div>
    <div class="k-item__meta entity-meta--faint" data-test="action-template">
      {{ t('action.template') }}{{ templateName }}
    </div>

    <div class="k-hint k-hint--warn" v-if="!channel" data-test="action-warning">
      {{ t('action.channelMissingHint') }}
    </div>

    <div class="k-item__foot">
      <span class="k-item__meta entity-meta--faint" data-test="action-referenced">
        {{ t('action.referencedBy', { n: referencedBy.length }) }}
      </span>
      <span class="k-spacer" />
      <button
        type="button"
        class="k-link k-link--danger"
        data-test="action-delete"
        @click.stop="emit('delete')"
      >
        {{ t('common.delete') }}
      </button>
    </div>
  </div>
</template>
