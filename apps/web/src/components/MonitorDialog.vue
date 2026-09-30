<script setup lang="ts">
import type { Monitor } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; groupId: string; monitor: Monitor | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const mode = ref<Monitor['mode']>('follow_global')
const sensitivity = ref<Monitor['sensitivity']>('medium')
const matchMode = ref<Monitor['matchMode']>('any')
const intentText = ref('')
const includeKeywords = ref<string[]>([])
const excludeKeywords = ref<string[]>([])
const useGlobalExcludes = ref(true)

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const modeOptions = computed(() =>
  (['follow_global', 'algorithm', 'algorithm_llm'] as const).map((value) => ({
    value,
    title: t(`monitor.mode.${value}`),
  })),
)
const sensitivityOptions = computed(() =>
  (['loose', 'medium', 'strict'] as const).map((value) => ({
    value,
    title: t(`monitor.sensitivity.${value}`),
  })),
)
const matchModeOptions = computed(() =>
  (['any', 'all'] as const).map((value) => ({ value, title: t(`monitor.matchMode.${value}`) })),
)

const valid = computed(() => name.value.trim().length > 0)

watch(
  () => [props.modelValue, props.monitor] as const,
  () => {
    name.value = props.monitor?.name ?? ''
    mode.value = props.monitor?.mode ?? 'follow_global'
    sensitivity.value = props.monitor?.sensitivity ?? 'medium'
    matchMode.value = props.monitor?.matchMode ?? 'any'
    intentText.value = props.monitor?.intentText ?? ''
    includeKeywords.value = [...(props.monitor?.includeKeywords ?? [])]
    excludeKeywords.value = [...(props.monitor?.excludeKeywords ?? [])]
    useGlobalExcludes.value = props.monitor?.useGlobalExcludes ?? true
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  if (!valid.value) return
  const payload = {
    name: name.value.trim(),
    mode: mode.value,
    sensitivity: sensitivity.value,
    matchMode: matchMode.value,
    intentText: intentText.value.trim(),
    includeKeywords: includeKeywords.value,
    excludeKeywords: excludeKeywords.value,
    useGlobalExcludes: useGlobalExcludes.value,
  }
  const ok = props.monitor
    ? await store.saveMonitor(props.monitor.id, payload)
    : await store.createMonitor({
        ...payload,
        groupId: props.groupId,
        enabled: true,
        actionIds: [],
      })
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="600">
    <v-card data-test="monitor-dialog">
      <v-card-title class="text-body-1">
        {{ monitor ? t('monitor.edit') : t('monitor.add') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="name" :label="t('common.name')" data-test="monitor-name-input" />

        <v-combobox
          v-model="includeKeywords"
          :label="t('monitor.keywords')"
          multiple
          chips
          closable-chips
          data-test="monitor-keywords-input"
        />
        <v-select
          v-model="matchMode"
          :items="matchModeOptions"
          :label="t('monitor.matchModeLabel')"
          data-test="monitor-match-mode-input"
        />

        <v-combobox
          v-model="excludeKeywords"
          :label="t('monitor.excludeKeywords')"
          multiple
          chips
          closable-chips
          data-test="monitor-exclude-input"
        />
        <v-checkbox
          v-model="useGlobalExcludes"
          :label="t('monitor.useGlobalExcludes')"
          density="compact"
          hide-details
          data-test="monitor-global-excludes-input"
        />

        <v-select
          v-model="mode"
          :items="modeOptions"
          :label="t('monitor.modeLabel')"
          data-test="monitor-mode-input"
        />
        <v-textarea
          v-if="mode === 'algorithm_llm'"
          v-model="intentText"
          :label="t('monitor.intent')"
          :hint="t('monitor.intentHint')"
          rows="2"
          persistent-hint
          data-test="monitor-intent-input"
        />
        <v-select
          v-model="sensitivity"
          :items="sensitivityOptions"
          :label="t('monitor.sensitivityLabel')"
          data-test="monitor-sensitivity-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="monitor-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
