<script setup lang="ts">
import { SETTINGS_DEFAULTS, type SettingKey, type UpdateSettingsInput } from '@kestrel/contracts'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SettingsField } from '@/components/settings/types'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{ fields: SettingsField[] }>()

const store = useConfigStore()
const { t } = useI18n()

/** 本地草稿：文本与数字改完（失焦 / 回车）才提交，免得每敲一个字打一次接口 */
const draft = ref<Record<string, unknown>>({})

watch(
  () => props.fields.map((field) => store.settings[field.key]),
  () => {
    for (const field of props.fields) draft.value[field.key] = store.settings[field.key]
  },
  { immediate: true, deep: true },
)

async function commit(key: SettingKey): Promise<void> {
  const next = draft.value[key]
  if (next === store.settings[key]) return
  await store.saveSettings({ [key]: next } as UpdateSettingsInput)
}

async function restore(key: SettingKey): Promise<void> {
  await store.resetSetting(key)
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}

/** 「恢复默认」按钮亮不亮：看存着的值跟出厂默认是不是一样，跟草稿无关 */
function isChanged(key: SettingKey): boolean {
  return store.settings[key] !== SETTINGS_DEFAULTS[key]
}
</script>

<template>
  <div class="settings-form">
    <div v-for="field in fields" :key="field.key" class="settings-row">
      <div class="settings-row__label">
        <div class="settings-row__name">{{ t(`settings.field.${field.key}`) }}</div>
        <div class="settings-row__hint">{{ t(`settings.hint.${field.key}`) }}</div>
      </div>

      <div class="settings-row__control">
        <v-text-field
          v-if="field.kind === 'number'"
          v-model.number="draft[field.key]"
          type="number"
          :min="field.min"
          :max="field.max"
          density="compact"
          hide-details
          :data-test="`setting-${field.key}`"
          @blur="commit(field.key)"
          @keyup.enter="commit(field.key)"
        />

        <v-text-field
          v-else-if="field.kind === 'text'"
          v-model="draft[field.key]"
          density="compact"
          hide-details
          :data-test="`setting-${field.key}`"
          @blur="commit(field.key)"
          @keyup.enter="commit(field.key)"
        />

        <v-select
          v-else-if="field.kind === 'select'"
          v-model="draft[field.key]"
          :items="field.options ?? []"
          density="compact"
          hide-details
          :data-test="`setting-${field.key}`"
          @update:model-value="commit(field.key)"
        />

        <v-switch
          v-else-if="field.kind === 'switch'"
          v-model="draft[field.key]"
          density="compact"
          hide-details
          :data-test="`setting-${field.key}`"
          @update:model-value="commit(field.key)"
        />

        <v-combobox
          v-else
          :model-value="asStringArray(draft[field.key])"
          multiple
          chips
          closable-chips
          density="compact"
          hide-details
          :data-test="`setting-${field.key}`"
          @update:model-value="
            (value) => {
              draft[field.key] = value
              commit(field.key)
            }
          "
        />

        <v-btn
          icon="mdi-restore"
          size="x-small"
          variant="text"
          :disabled="!isChanged(field.key)"
          :title="t('settings.restoreDefault')"
          :data-test="`restore-${field.key}`"
          @click="restore(field.key)"
        />
      </div>
    </div>
  </div>
</template>
