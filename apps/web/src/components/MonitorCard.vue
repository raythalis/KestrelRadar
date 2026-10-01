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
  <div
    class="k-item"
    :class="{ 'k-item--off': !monitor.enabled }"
    role="button"
    tabindex="0"
    data-test="monitor-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
  >
    <div class="k-item__top">
      <span class="k-tag" data-test="monitor-sensitivity">{{ sensitivityLabel }}</span>
      <span v-if="boundActions" class="k-tag k-tag--off" data-test="monitor-bound">
        {{ t('monitor.onlyActions', { names: boundActions }) }}
      </span>
      <span class="k-spacer" />
      <span @click.stop>
        <v-switch
          :model-value="monitor.enabled"
          :title="monitor.enabled ? t('common.enabled') : t('common.disabled')"
          data-test="monitor-enabled"
          @update:model-value="(value) => store.setMonitorEnabled(monitor.id, Boolean(value))"
        />
      </span>
    </div>

    <div class="k-item__title" data-test="monitor-name">{{ monitor.name }}</div>
    <div class="k-item__sub" data-test="monitor-mode">{{ modeLabel }} · {{ matchModeLabel }}</div>

    <div class="d-flex flex-wrap ga-1" data-test="monitor-keywords">
      <span v-for="keyword in monitor.includeKeywords" :key="keyword" class="k-tag">
        {{ keyword }}
      </span>
      <span v-if="monitor.includeKeywords.length === 0" class="entity-meta entity-meta--faint">
        {{ t('monitor.noKeywords') }}
      </span>
    </div>

    <div class="k-item__foot">
      <span class="k-spacer" />
      <button
        type="button"
        class="k-link k-link--danger"
        data-test="monitor-delete"
        @click.stop="emit('delete')"
      >
        {{ t('common.delete') }}
      </button>
    </div>
  </div>
</template>
