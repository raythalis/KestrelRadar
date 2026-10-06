<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SettingsForm from '@/components/settings/SettingsForm.vue'
import TemplateList from '@/components/settings/TemplateList.vue'
import type { SettingsCard } from '@/components/settings/types'
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
    llmPlus: value === 'algorithm_llm',
  })),
)
/** 消息语言：只影响固定文案（标记与来源分隔符），正文仍是模板那套 */
const languageOptions = computed(() =>
  (['zh', 'en'] as const).map((value) => ({ value, title: t(`settings.language.${value}`) })),
)
const fallbackOptions = computed(() =>
  (['fallback', 'error'] as const).map((value) => ({
    value,
    title: t(`settings.fallback.${value}`),
  })),
)
/** 时区下拉：第一项是「跟随服务器」，其余用浏览器给出的全球时区表 */
const timezoneOptions = computed(() => {
  // 时区表来自浏览器的 Intl；老 lib 定义里没有 supportedValuesOf，取出来先判存在再用
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf
  const zones: string[] = typeof supported === 'function' ? supported('timeZone') : []
  return [
    { value: 'system', title: t('settings.timezone.system') },
    ...zones.map((zone) => ({ value: zone, title: zone })),
  ]
})

/** 每个 tab 下按“一件事一张卡”分组，改动即自动写回，没有保存与恢复默认按钮 */
const cardsByTab = computed<Record<string, SettingsCard[]>>(() => ({
  general: [
    {
      id: 'region',
      titleKey: 'settings.card.region',
      noteKey: 'settings.cardNote.region',
      fields: [
        {
          key: 'locale',
          kind: 'locale',
          options: [
            { value: 'zh-CN', title: '中文' },
            { value: 'en', title: 'English' },
          ],
        },
        { key: 'timezone', kind: 'select', options: timezoneOptions.value },
      ],
    },
  ],
  judge: [
    {
      id: 'judgeRules',
      titleKey: 'settings.card.judgeRules',
      noteKey: 'settings.cardNote.judgeRules',
      fields: [
        { key: 'judgeMode', kind: 'select', options: judgeModeOptions.value },
        {
          key: 'scoreHighLine',
          kind: 'scoreBands',
          lowKey: 'scoreLowLine',
          labelKey: 'settings.bandField.medium',
          hintKey: '',
        },
        {
          key: 'looseHighLine',
          kind: 'scoreBands',
          lowKey: 'looseLowLine',
          labelKey: 'settings.bandField.loose',
          hintKey: '',
        },
        {
          key: 'strictHighLine',
          kind: 'scoreBands',
          lowKey: 'strictLowLine',
          labelKey: 'settings.bandField.strict',
          hintKey: '',
        },
      ],
    },
    {
      id: 'model',
      titleKey: 'settings.card.model',
      noteKey: 'settings.cardNote.model',
      fields: [
        { key: 'llmTimeoutSeconds', kind: 'number', min: 5, max: 300 },
        { key: 'llmMaxRetries', kind: 'number', min: 0, max: 5 },
        { key: 'llmFallbackMode', kind: 'select', options: fallbackOptions.value },
      ],
    },
    {
      id: 'filters',
      titleKey: 'settings.card.filters',
      noteKey: 'settings.cardNote.filters',
      fields: [{ key: 'globalExcludeKeywords', kind: 'keywords' }],
    },
  ],
  collection: [
    {
      id: 'collect',
      titleKey: 'settings.card.collect',
      noteKey: 'settings.cardNote.collect',
      fields: [
        { key: 'concurrency', kind: 'number', min: 1, max: 20 },
        { key: 'requestTimeoutSeconds', kind: 'number', min: 5, max: 300 },
        { key: 'maxRetries', kind: 'number', min: 0, max: 5 },
      ],
    },
    {
      id: 'retention',
      titleKey: 'settings.card.retention',
      noteKey: 'settings.cardNote.retention',
      fields: [
        { key: 'retentionDays', kind: 'number', min: 7, max: 3650 },
        { key: 'eventArchiveDays', kind: 'number', min: 1, max: 365 },
        { key: 'freshnessWindowDays', kind: 'number', min: 0, max: 365 },
      ],
    },
    {
      id: 'rsshub',
      titleKey: 'settings.card.rsshub',
      noteKey: 'settings.cardNote.rsshub',
      fields: [
        { key: 'rsshubBaseUrl', kind: 'text', max: 500 },
        { key: 'rsshubAccessKey', kind: 'text', max: 200 },
        {
          key: 'rsshubBaseUrl',
          id: 'rsshubTest',
          kind: 'rsshubTest',
          labelKey: '',
          hintKey: 'settings.hint.rsshubTest',
        },
      ],
    },
  ],
  delivery: [
    {
      id: 'delivery',
      titleKey: 'settings.card.delivery',
      noteKey: 'settings.cardNote.delivery',
      fields: [
        { key: 'language', kind: 'select', options: languageOptions.value },
        { key: 'dailyDeliveryLimit', kind: 'number', min: 0, max: 1000 },
        { key: 'deliveryTimeoutSeconds', kind: 'number', min: 5, max: 120 },
      ],
    },
  ],
}))

const tabs = computed(() => [
  { value: 'general', icon: 'mdi-cog-outline', title: t('settings.tab.general') },
  { value: 'judge', icon: 'mdi-filter-variant', title: t('settings.tab.judge') },
  { value: 'collection', icon: 'mdi-tray-arrow-down', title: t('settings.tab.collection') },
  { value: 'delivery', icon: 'mdi-send-outline', title: t('settings.tab.delivery') },
])

const activeCards = computed(() => cardsByTab.value[tab.value] ?? [])
</script>

<template>
  <div class="k2-page k2-page--wide" data-test="settings-page">
    <div class="k2-page__head">
      <div class="k2-page__lead">
        <h1 class="k2-page__title">{{ t('nav.settings') }}</h1>
        <p class="k2-page__note">{{ t('settings.subtitle') }}</p>
      </div>
    </div>

    <div class="k2-sets-layout">
      <nav class="k2-subnav" data-test="settings-tabs">
        <button
          v-for="item in tabs"
          :key="item.value"
          type="button"
          class="k2-subnav__item"
          :class="{ 'k2-subnav__item--on': tab === item.value }"
          :data-test="`tab-${item.value}`"
          @click="tab = item.value"
        >
          <i class="mdi" :class="item.icon" />
          <span>{{ item.title }}</span>
        </button>
      </nav>

      <div class="k2-sets-pane">
        <SettingsForm :cards="activeCards" :data-test="`pane-${tab}`" />
        <TemplateList v-if="tab === 'delivery'" data-test="pane-templates" />
      </div>
    </div>
  </div>
</template>
