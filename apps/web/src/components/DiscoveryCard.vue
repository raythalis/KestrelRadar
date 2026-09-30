<script setup lang="ts">
import type { Discovery } from '@kestrel/contracts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import TestLamps from '@/components/TestLamps.vue'
import { useConfigStore } from '@/stores/config'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{ discovery: Discovery }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const store = useConfigStore()
const { t } = useI18n()
const testing = ref(false)

const kindLabel = computed(() => t(`discovery.kind.${props.discovery.kind}`))

async function runTest(): Promise<void> {
  testing.value = true
  try {
    await store.testDiscovery(props.discovery.id)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <v-card variant="tonal" class="pa-3 cable" data-test="discovery-card">
    <div class="d-flex align-center ga-2">
      <v-chip size="x-small" label color="primary" data-test="discovery-kind">
        {{ kindLabel }}
      </v-chip>
      <span class="text-body-2 font-weight-medium text-truncate" data-test="discovery-name">
        {{ discovery.name }}
      </span>
      <v-spacer />
      <v-switch
        :model-value="discovery.enabled"
        color="primary"
        density="compact"
        hide-details
        data-test="discovery-enabled"
        @update:model-value="(value) => store.setDiscoveryEnabled(discovery.id, Boolean(value))"
      />
    </div>

    <div class="text-caption text-medium-emphasis text-truncate" data-test="discovery-target">
      {{ discovery.target }}
    </div>

    <TestLamps
      :route-ok="discovery.routeOk"
      :content-ok="discovery.contentOk"
      :message="discovery.lastCheckMessage"
    />

    <div class="text-caption" data-test="discovery-next-run">
      {{ t('discovery.nextRun') }}{{ formatDateTime(discovery.nextRunAt) }}
    </div>
    <div class="text-caption text-medium-emphasis">
      {{ t('discovery.itemCount', { n: discovery.itemCount }) }} · {{ t('discovery.latestItem')
      }}{{ formatDateTime(discovery.latestItemAt) }}
    </div>

    <div
      v-if="discovery.baselineEstablishedAt"
      class="text-caption text-medium-emphasis"
      data-test="baseline-note"
    >
      {{ t('discovery.baseline', { n: discovery.baselineItemCount ?? 0 }) }}
    </div>

    <div class="d-flex align-center ga-2 mt-2">
      <v-btn
        size="x-small"
        variant="text"
        :loading="testing"
        data-test="discovery-test"
        @click="runTest"
      >
        {{ t('discovery.test') }}
      </v-btn>
      <v-spacer />
      <v-btn
        size="x-small"
        variant="text"
        icon="mdi-pencil"
        data-test="discovery-edit"
        @click="emit('edit')"
      />
      <v-btn
        size="x-small"
        variant="text"
        color="error"
        icon="mdi-delete"
        data-test="discovery-delete"
        @click="emit('delete')"
      />
    </div>
  </v-card>
</template>
