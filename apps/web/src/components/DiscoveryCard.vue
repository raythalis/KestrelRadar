<script setup lang="ts">
import type { Discovery, DiscoveryTestResult } from '@kestrel/contracts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{ discovery: Discovery }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const testing = ref(false)
const result = ref<DiscoveryTestResult | null>(null)

const kindLabel = computed(() => t(`discovery.kind.${props.discovery.kind}`))

/** 状态点：还没试过是灰的；试过以后按“通不通、有没有内容”给三档 */
const dotState = computed(() => {
  if (testing.value) return 'busy'
  const last = result.value
  if (!last) return 'idle'
  if (!last.routeOk) return 'err'
  return last.contentOk ? 'ok' : 'warn'
})

const dotText = computed(() => {
  if (testing.value) return t('discovery.testRunning')
  const last = result.value
  if (!last) return t('discovery.test')
  if (!last.routeOk) return t('discovery.testFail')
  return last.contentOk
    ? t('discovery.testOk', { n: last.foundItemCount })
    : t('discovery.testEmpty')
})

/** 只有真的出问题才提示：路由不通算错，通但没内容算提醒 */
const checkHintClass = computed(() => {
  if (!props.discovery.lastCheckMessage) return ''
  if (!props.discovery.routeOk) return 'k-hint--err'
  if (!props.discovery.contentOk) return 'k-hint--warn'
  return ''
})

async function runTest(): Promise<void> {
  testing.value = true
  try {
    result.value = await store.testDiscovery(props.discovery.id)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div
    class="k-item"
    :class="{ 'k-item--off': !discovery.enabled }"
    role="button"
    tabindex="0"
    data-test="discovery-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
  >
    <div class="k-item__top">
      <span class="k-tag k-tag--accent" data-test="discovery-kind">{{ kindLabel }}</span>
      <span class="k-spacer" />
      <span @click.stop>
        <v-switch
          :model-value="discovery.enabled"
          :title="discovery.enabled ? t('common.enabled') : t('common.disabled')"
          data-test="discovery-enabled"
          @update:model-value="(value) => store.setDiscoveryEnabled(discovery.id, Boolean(value))"
        />
      </span>
    </div>

    <div class="k-item__title" data-test="discovery-name">{{ discovery.name }}</div>
    <div class="k-item__sub" data-test="discovery-target">{{ discovery.target }}</div>

    <div class="k-hint" :class="checkHintClass" v-if="checkHintClass" data-test="discovery-message">
      {{ discovery.lastCheckMessage }}
    </div>

    <div class="k-item__meta" style="margin-top: 6px">
      <button
        type="button"
        class="status-dot"
        :class="`status-dot--${dotState}`"
        :disabled="testing"
        :title="t('discovery.testHint')"
        data-test="discovery-test"
        @click.stop="runTest"
      >
        {{ dotText }}
      </button>
    </div>

    <div class="k-item__meta" data-test="discovery-next-run">
      <v-icon size="13" icon="mdi-clock-outline" />
      {{ t('discovery.nextRun') }}{{ formatDateTime(discovery.nextRunAt) }}
    </div>
    <div class="k-item__meta">
      {{ t('discovery.itemCount', { n: discovery.itemCount }) }} · {{ t('discovery.latestItem')
      }}{{ formatDateTime(discovery.latestItemAt) }}
    </div>

    <div class="k-item__foot">
      <span class="k-item__meta entity-meta--faint" data-test="baseline-note">
        <template v-if="discovery.baselineEstablishedAt">
          {{ t('discovery.baseline', { n: discovery.baselineItemCount ?? 0 }) }}
        </template>
      </span>
      <span class="k-spacer" />
      <button
        type="button"
        class="k-link k-link--danger"
        data-test="discovery-delete"
        @click.stop="emit('delete')"
      >
        {{ t('common.delete') }}
      </button>
    </div>
  </div>
</template>
