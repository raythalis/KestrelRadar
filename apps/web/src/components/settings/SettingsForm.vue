<script setup lang="ts">
import {
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  type SettingKey,
  type UpdateSettingsInput,
} from '@kestrel/contracts'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { probeRsshub } from '@/api/config'
import ScoreBandField from '@/components/settings/ScoreBandField.vue'
import LlmPlusTag from '@/components/biz/LlmPlusTag.vue'
import TagsField from '@/components/biz/TagsField.vue'
import type { SettingsCard, SettingsField } from '@/components/settings/types'
import { useConfigStore } from '@/stores/config'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ cards: SettingsCard[] }>()

const store = useConfigStore()
const ui = useUiStore()
const { t } = useI18n()

/** 界面语言只存前端偏好，不进设置接口；但一样走表单草稿，保存那一下才真正切过来 */
const LOCALE_KEY = 'locale'

/** 只认后端认识的键 */
function isBackendKey(key: string): key is SettingKey {
  return SETTINGS_KEYS.includes(key as SettingKey)
}

/** 一个字段牵动的键：区间类控件是「高线 + 低线」两个，其余就一个 */
function draftKeys(field: SettingsField): string[] {
  const keys: string[] = [field.key]
  if (field.lowKey) keys.push(field.lowKey)
  return keys
}

/** 这些键当前「已保存的值」：界面语言读前端偏好，其余读后端设置 */
function savedValue(key: string): unknown {
  if (isBackendKey(key)) return store.settings[key]
  if (key === LOCALE_KEY) return ui.locale
  return undefined
}

function fieldId(field: SettingsField): string {
  return field.id ?? field.key
}

/**
 * 草稿 = 界面上正在编辑的值；seeded = 上次「已保存」的值。
 * 两者相等说明这项没动过，跟着已保存值走；不相等就是「改了还没保存」，保留用户输入。
 */
const draft = ref<Record<string, unknown>>({})
const seeded = ref<Record<string, unknown>>({})
/** 字段级校验提示；卡片级保存失败提示 */
const fieldErrors = ref<Record<string, string>>({})
const cardErrors = ref<Record<string, string>>({})

watch(
  () =>
    props.cards.map((card) =>
      card.fields.flatMap((field) =>
        draftKeys(field).map((key) => [key, savedValue(key)] as const),
      ),
    ),
  () => {
    for (const card of props.cards) {
      for (const field of card.fields) {
        for (const key of draftKeys(field)) {
          const current = draft.value[key]
          if (current === undefined || current === seeded.value[key]) {
            draft.value[key] = savedValue(key)
          }
          seeded.value[key] = savedValue(key)
        }
      }
    }
  },
  { immediate: true, deep: true },
)

/** 这一组有没有没保存的改动：有改动保存与重置才可用 */
function isDirty(card: SettingsCard): boolean {
  return card.fields.some((field) =>
    draftKeys(field).some((key) => draft.value[key] !== savedValue(key)),
  )
}

function clearFieldError(field: SettingsField): void {
  delete fieldErrors.value[fieldId(field)]
}

/** 数值输入框里显示什么：等于默认值就留空（默认值走 placeholder），改过的才填数字 */
function numberDisplay(field: SettingsField): string {
  const current = draft.value[field.key]
  if (isBackendKey(field.key) && current === SETTINGS_DEFAULTS[field.key]) return ''
  return String(current ?? '')
}

/** 默认值（放 placeholder 里） */
function numberDefault(field: SettingsField): string {
  return isBackendKey(field.key) ? String(SETTINGS_DEFAULTS[field.key]) : ''
}

/** 数值输入：清空＝回到默认值，填了非法字符先留着让校验去拦 */
function onNumberInput(field: SettingsField, event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  if (!isBackendKey(field.key)) return
  if (raw === '') draft.value[field.key] = SETTINGS_DEFAULTS[field.key]
  else draft.value[field.key] = Number.isNaN(Number(raw)) ? raw : Number(raw)
  clearFieldError(field)
}

/** 保存前校验：数值别越界，区间低线别顶到高线上 */
function validateField(field: SettingsField): string | null {
  if (field.kind === 'number') {
    const raw = draft.value[field.key]
    const value = Number(raw)
    if (raw === '' || raw === null || raw === undefined || Number.isNaN(value)) {
      return t('settings.error.number')
    }
    if (!Number.isInteger(value)) return t('settings.error.integer')
    if (field.min !== undefined && value < field.min) {
      return t('settings.error.range', { min: field.min, max: field.max })
    }
    if (field.max !== undefined && value > field.max) {
      return t('settings.error.range', { min: field.min, max: field.max })
    }
  }

  if (field.kind === 'scoreBands') {
    const high = Number(draft.value[field.key])
    const low = field.lowKey ? Number(draft.value[field.lowKey]) : high
    if (Number.isNaN(high) || Number.isNaN(low)) return t('settings.error.number')
    if (low >= high) return t('settings.error.band')
  }

  return null
}

/** 保存这一组：先校验本组改过的项，全部通过才一起写回；界面语言在写回成功后才换 */
async function saveCard(card: SettingsCard): Promise<void> {
  cardErrors.value[card.id] = ''
  for (const field of card.fields) clearFieldError(field)

  const patch: Record<string, unknown> = {}
  let localeNext: string | null = null
  let invalid = false
  for (const field of card.fields) {
    const keys = draftKeys(field)
    if (!keys.some((key) => draft.value[key] !== savedValue(key))) continue
    const message = validateField(field)
    if (message) {
      fieldErrors.value[fieldId(field)] = message
      invalid = true
      continue
    }
    // 只提交真正改过的键：区间类控件是两条线，常常只动了一条
    for (const key of keys) {
      if (draft.value[key] === savedValue(key)) continue
      if (isBackendKey(key)) patch[key] = draft.value[key]
      else if (key === LOCALE_KEY) localeNext = String(draft.value[key])
    }
  }
  if (invalid) return
  if (Object.keys(patch).length === 0 && !localeNext) return

  if (Object.keys(patch).length > 0) {
    const ok = await store.saveSettings(patch as UpdateSettingsInput)
    if (!ok) {
      cardErrors.value[card.id] = store.errorMessage || t('settings.error.save')
      return
    }
  }
  if (localeNext === 'zh-CN' || localeNext === 'en') ui.setLocale(localeNext)
}

/** 重置这一组：丢掉没保存的改动，回到上一次保存的值 */
function resetCard(card: SettingsCard): void {
  for (const field of card.fields) {
    for (const key of draftKeys(field)) draft.value[key] = savedValue(key)
    clearFieldError(field)
  }
  cardErrors.value[card.id] = ''
}

/** 区间控件的两条线 */
function setBand(field: SettingsField, which: 'high' | 'low', value: number): void {
  const key = which === 'high' ? field.key : (field.lowKey ?? 'scoreLowLine')
  draft.value[key] = value
  clearFieldError(field)
}

/** RSSHub 连通测试：拿输入框里当前这串地址去探，结果只放内存，不写设置 */
const rsshubState = ref<Record<string, { testing?: boolean; ok?: boolean; message?: string }>>({})

function rsshubUrl(field: SettingsField): string {
  return String(draft.value[field.key] ?? '').trim()
}

async function runRsshubTest(field: SettingsField): Promise<void> {
  const key = fieldId(field)
  const url = rsshubUrl(field)
  if (!url) return
  rsshubState.value[key] = { testing: true }
  try {
    const result = await probeRsshub(true, url)
    rsshubState.value[key] = { ok: result.ok, message: result.message }
  } catch (error) {
    rsshubState.value[key] = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/** 当前展开的下拉（受控，跟弹窗里的写法保持一致） */
const openMenu = ref<string | null>(null)

/** 下拉当前值就走草稿：界面语言也要保存后才换 */
function valueOf(field: SettingsField): string {
  return String(draft.value[field.key] ?? '')
}

function titleOf(field: SettingsField): string {
  const current = valueOf(field)
  return field.options?.find((option) => option.value === current)?.title ?? current
}

/** 当前选的是不是「LLM+」那一档（那档的名字与星芒图标由 LlmPlusTag 画） */
function llmPlusOf(field: SettingsField): boolean {
  const current = valueOf(field)
  return Boolean(field.options?.find((option) => option.value === current)?.llmPlus)
}

function pick(field: SettingsField, value: string): void {
  draft.value[field.key] = value
  clearFieldError(field)
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}
</script>

<template>
  <div class="k2-sets">
    <section
      v-for="card in cards"
      :key="card.id"
      class="k2-card k2-set"
      :data-test="`setting-card-${card.id}`"
    >
      <div class="k2-card__head">
        <span class="k2-card__heading">
          <span class="k2-card__title">{{ t(card.titleKey) }}</span>
          <span v-if="card.noteKey" class="k2-card__sub">{{ t(card.noteKey) }}</span>
        </span>
      </div>

      <div v-for="field in card.fields" :key="field.id ?? field.key" class="k2-set__row">
        <div class="k2-set__label">
          <span v-if="field.labelKey !== ''" class="k2-field__label">
            {{ t(field.labelKey ?? `settings.field.${field.key}`) }}
          </span>
          <span v-if="field.hintKey !== ''" class="k2-field__hint">
            {{ t(field.hintKey ?? `settings.hint.${field.key}`) }}
          </span>
          <span v-if="field.kind === 'number' && field.min !== undefined" class="k2-field__hint">
            {{ t('settings.range', { min: field.min, max: field.max }) }}
          </span>
        </div>

        <div class="k2-set__control">
          <input
            v-if="field.kind === 'number'"
            class="k2-input"
            type="number"
            :value="numberDisplay(field)"
            :placeholder="numberDefault(field)"
            :min="field.min"
            :max="field.max"
            :data-test="`setting-${field.id ?? field.key}`"
            @input="onNumberInput(field, $event)"
          />

          <input
            v-else-if="field.kind === 'text'"
            v-model="draft[field.key]"
            class="k2-input"
            :data-test="`setting-${field.id ?? field.key}`"
            @input="clearFieldError(field)"
          />

          <span v-else-if="field.kind === 'select' || field.kind === 'locale'" class="k2-inputwrap">
            <v-menu
              :model-value="openMenu === (field.id ?? field.key)"
              :close-on-content-click="true"
              content-class="k2-menu"
              @update:model-value="
                (open: boolean) => (openMenu = open ? (field.id ?? field.key) : null)
              "
            >
              <template #activator="{ props: menuProps }">
                <button
                  type="button"
                  class="k2-select"
                  v-bind="menuProps"
                  :data-test="`setting-${field.id ?? field.key}`"
                >
                  <span class="k2-mode-line">
                    <LlmPlusTag v-if="llmPlusOf(field)" />
                    <template v-else>{{ titleOf(field) }}</template>
                  </span>
                  <i class="mdi mdi-chevron-down k2-select__caret" />
                </button>
              </template>
              <div class="k2-menu__scroll">
                <button
                  v-for="option in field.options ?? []"
                  :key="option.value"
                  type="button"
                  class="k2-menu__item"
                  @click="pick(field, option.value)"
                >
                  <v-icon size="18">
                    {{
                      option.value === valueOf(field) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'
                    }}
                  </v-icon>
                  <LlmPlusTag v-if="option.llmPlus" />
                  <template v-else>{{ option.title }}</template>
                </button>
              </div>
            </v-menu>
          </span>

          <button
            v-else-if="field.kind === 'switch'"
            type="button"
            class="k2-switch"
            :class="{ 'k2-switch--on': Boolean(draft[field.key]) }"
            :data-test="`setting-${field.id ?? field.key}`"
            @click="draft[field.key] = !draft[field.key]"
          >
            <span class="k2-switch__dot" />
          </button>

          <ScoreBandField
            v-else-if="field.kind === 'scoreBands'"
            :high="Number(draft[field.key] ?? 70)"
            :low="Number(draft[field.lowKey ?? 'scoreLowLine'] ?? 30)"
            :data-test="`setting-${field.id ?? field.key}`"
            @update:high="(value) => setBand(field, 'high', value)"
            @update:low="(value) => setBand(field, 'low', value)"
          />

          <span v-else-if="field.kind === 'rsshubTest'" class="k2-words__add">
            <button
              type="button"
              class="k2-btn k2-btn--ghost k2-btn--sm"
              :disabled="rsshubState[fieldId(field)]?.testing || !rsshubUrl(field)"
              :data-test="`setting-${field.id ?? field.key}`"
              @click="runRsshubTest(field)"
            >
              <i class="mdi mdi-refresh" />
              {{
                rsshubState[fieldId(field)]?.testing
                  ? t('settings.rsshubTest.testing')
                  : t('settings.rsshubTest.button')
              }}
            </button>
            <span
              v-if="rsshubState[fieldId(field)]?.message"
              class="k2-field__hint k2-testresult"
              :class="rsshubState[fieldId(field)]?.ok ? 'k2-testresult--ok' : 'k2-testresult--bad'"
              data-test="rsshub-test-result"
            >
              {{ rsshubState[fieldId(field)]?.message }}
            </span>
          </span>

          <TagsField
            v-else
            :model-value="asStringArray(draft[field.key])"
            :hint="t('settings.words.count', { n: asStringArray(draft[field.key]).length })"
            :data-test="`setting-${field.id ?? field.key}`"
            @update:model-value="
              (value) => {
                draft[field.key] = value
                clearFieldError(field)
              }
            "
          />

          <span
            v-if="fieldErrors[fieldId(field)]"
            class="k2-field__error"
            :data-test="`error-${fieldId(field)}`"
          >
            {{ fieldErrors[fieldId(field)] }}
          </span>
        </div>
      </div>

      <hr class="k2-card__sep" />

      <div class="k2-card__foot k2-set__foot">
        <span v-if="cardErrors[card.id]" class="k2-field__error" data-test="card-error">
          {{ cardErrors[card.id] }}
        </span>
        <button
          type="button"
          class="k2-btn k2-btn--ghost"
          :data-test="`card-reset-${card.id}`"
          :disabled="!isDirty(card)"
          @click="resetCard(card)"
        >
          {{ t('settings.cardReset') }}
        </button>
        <button
          type="button"
          class="k2-btn k2-btn--primary"
          :data-test="`card-save-${card.id}`"
          :disabled="!isDirty(card) || store.saving"
          @click="saveCard(card)"
        >
          {{ t('settings.cardSave') }}
        </button>
      </div>
    </section>
  </div>
</template>
