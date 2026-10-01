<script setup lang="ts">
import { SETTINGS_DEFAULTS, type SettingKey, type UpdateSettingsInput } from '@kestrel/contracts'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SettingsCard, SettingsField } from '@/components/settings/types'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{ cards: SettingsCard[] }>()

const store = useConfigStore()
const { t } = useI18n()

/** 本地草稿：输入框只改草稿，点卡片上的「保存」才写回后端 */
const draft = ref<Record<string, unknown>>({})

watch(
  () =>
    props.cards.map((card) => card.fields.map((field) => [field.key, store.settings[field.key]])),
  () => {
    for (const card of props.cards) {
      for (const field of card.fields) draft.value[field.key] = store.settings[field.key]
    }
  },
  { immediate: true, deep: true },
)

/** 这张卡里有改动没保存 */
function dirty(card: SettingsCard): boolean {
  return card.fields.some((field) => draft.value[field.key] !== store.settings[field.key])
}

/** 这张卡里有值跟出厂默认不一样 */
function changed(card: SettingsCard): boolean {
  return card.fields.some((field) => isChanged(field.key))
}

function isChanged(key: SettingKey): boolean {
  return store.settings[key] !== SETTINGS_DEFAULTS[key]
}

async function saveCard(card: SettingsCard): Promise<void> {
  const patch: Record<string, unknown> = {}
  for (const field of card.fields) {
    if (draft.value[field.key] !== store.settings[field.key])
      patch[field.key] = draft.value[field.key]
  }
  if (Object.keys(patch).length === 0) return
  await store.saveSettings(patch as UpdateSettingsInput)
}

async function restoreCard(card: SettingsCard): Promise<void> {
  for (const field of card.fields) {
    if (isChanged(field.key)) await store.resetSetting(field.key)
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}
</script>

<template>
  <div class="settings-form">
    <section
      v-for="card in cards"
      :key="card.id"
      class="k-card settings-card"
      :data-test="`setting-card-${card.id}`"
    >
      <header class="settings-card__head">
        <div>
          <div class="k-card__title">{{ t(card.titleKey) }}</div>
          <div v-if="card.noteKey" class="k-card__note">{{ t(card.noteKey) }}</div>
        </div>
        <span class="k-spacer" />
        <button
          type="button"
          class="k-link"
          :disabled="!dirty(card)"
          :data-test="`save-${card.id}`"
          @click="saveCard(card)"
        >
          {{ t('common.save') }}
        </button>
        <button
          type="button"
          class="k-link k-link--danger"
          :disabled="!changed(card)"
          :data-test="`restore-${card.id}`"
          @click="restoreCard(card)"
        >
          {{ t('settings.restoreDefault') }}
        </button>
      </header>

      <div v-for="field in card.fields" :key="field.key" class="settings-row">
        <div class="settings-row__label">
          <div class="settings-row__name">{{ t(`settings.field.${field.key}`) }}</div>
          <div class="settings-row__hint">{{ t(`settings.hint.${field.key}`) }}</div>
          <div
            v-if="field.kind === 'number' && field.min !== undefined"
            class="settings-row__range"
          >
            {{ t('settings.range', { min: field.min, max: field.max }) }}
          </div>
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
          />

          <v-text-field
            v-else-if="field.kind === 'text'"
            v-model="draft[field.key]"
            density="compact"
            hide-details
            :data-test="`setting-${field.key}`"
          />

          <v-select
            v-else-if="field.kind === 'select'"
            v-model="draft[field.key]"
            :items="field.options ?? []"
            density="compact"
            hide-details
            :data-test="`setting-${field.key}`"
          />

          <v-switch
            v-else-if="field.kind === 'switch'"
            v-model="draft[field.key]"
            density="compact"
            hide-details
            :data-test="`setting-${field.key}`"
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
            @update:model-value="(value) => (draft[field.key] = value)"
          />
        </div>
      </div>
    </section>
  </div>
</template>
