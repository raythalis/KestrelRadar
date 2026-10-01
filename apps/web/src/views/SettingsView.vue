<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SettingsForm from '@/components/settings/SettingsForm.vue'
import TemplateList from '@/components/settings/TemplateList.vue'
import type { SettingsField } from '@/components/settings/types'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

const tab = ref('general')

onMounted(() => {
  if (!store.snapshot) void store.load()
})

const judgeModeOptions = computed(() =>
  (['algorithm', 'algorithm_llm'] as const).map((value) => ({
    value,
    title: t(`monitor.mode.${value}`),
  })),
)
const fallbackOptions = computed(() =>
  (['fallback', 'error'] as const).map((value) => ({
    value,
    title: t(`settings.fallback.${value}`),
  })),
)
const languageOptions = computed(() =>
  (['zh', 'en'] as const).map((value) => ({ value, title: t(`settings.language.${value}`) })),
)

const generalFields = computed<SettingsField[]>(() => [
  { key: 'language', kind: 'select', options: languageOptions.value },
  { key: 'timezone', kind: 'text' },
])

const judgeFields = computed<SettingsField[]>(() => [
  { key: 'judgeMode', kind: 'select', options: judgeModeOptions.value },
  { key: 'scoreHighLine', kind: 'number', min: 5, max: 100 },
  { key: 'scoreLowLine', kind: 'number', min: 0, max: 95 },
  { key: 'sensitivityShift', kind: 'number', min: 0, max: 40 },
  { key: 'llmFallbackMode', kind: 'select', options: fallbackOptions.value },
  { key: 'globalExcludeKeywords', kind: 'keywords' },
])

const collectionFields = computed<SettingsField[]>(() => [
  { key: 'concurrency', kind: 'number', min: 1, max: 20 },
  { key: 'requestTimeoutSeconds', kind: 'number', min: 5, max: 300 },
  { key: 'maxRetries', kind: 'number', min: 0, max: 5 },
  { key: 'retentionDays', kind: 'number', min: 7, max: 3650 },
  { key: 'eventArchiveDays', kind: 'number', min: 1, max: 365 },
  { key: 'freshnessWindowDays', kind: 'number', min: 0, max: 365 },
])

const deliveryFields = computed<SettingsField[]>(() => [
  { key: 'dailyDeliveryLimit', kind: 'number', min: 0, max: 1000 },
])

const sourceFields = computed<SettingsField[]>(() => [
  { key: 'rsshubBaseUrl', kind: 'text' },
  { key: 'rsshubAccessKey', kind: 'text' },
])

const tabs = computed(() => [
  { value: 'general', title: t('settings.tab.general') },
  { value: 'judge', title: t('settings.tab.judge') },
  { value: 'collection', title: t('settings.tab.collection') },
  { value: 'delivery', title: t('settings.tab.delivery') },
  { value: 'source', title: t('settings.tab.source') },
  { value: 'templates', title: t('settings.tab.templates') },
])
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-head__title">{{ t('nav.settings') }}</h2>
        <p class="page-head__note">{{ t('settings.subtitle') }}</p>
      </div>
    </div>

    <v-alert
      v-if="store.errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
      data-test="settings-error"
    >
      {{ store.errorMessage }}
    </v-alert>

    <v-tabs v-model="tab" density="comfortable" color="primary" data-test="settings-tabs">
      <v-tab
        v-for="item in tabs"
        :key="item.value"
        :value="item.value"
        :data-test="`tab-${item.value}`"
      >
        {{ item.title }}
      </v-tab>
    </v-tabs>
    <v-divider class="mb-5" style="border-color: var(--k-border)" />

    <SettingsForm v-if="tab === 'general'" :fields="generalFields" data-test="pane-general" />
    <SettingsForm v-else-if="tab === 'judge'" :fields="judgeFields" data-test="pane-judge" />
    <SettingsForm
      v-else-if="tab === 'collection'"
      :fields="collectionFields"
      data-test="pane-collection"
    />
    <SettingsForm
      v-else-if="tab === 'delivery'"
      :fields="deliveryFields"
      data-test="pane-delivery"
    />
    <SettingsForm v-else-if="tab === 'source'" :fields="sourceFields" data-test="pane-source" />
    <TemplateList v-else data-test="pane-templates" />
  </div>
</template>
