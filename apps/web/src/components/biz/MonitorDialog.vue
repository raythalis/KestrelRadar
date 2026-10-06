<!-- MonitorDialog：监听的填表弹窗（业务组件层）。
     字段按「这条监听什么时候算命中、命中了怎么走」排：
       启用 → 名称 → 模式 →（算法 + LLM 时才有）意图描述 → 关键词 + 匹配方式 → 排除词（可追加全局排除词）
       → 灵敏度 → 指定关联动作（留空＝执行全部动作）。
     互动：关键词/排除词用标签输入；「指定关联动作」是多选，留空就是把全部动作都跑上，不另外写解释。
     只出事件，不碰 store、不发请求。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import TagsField from '@/components/biz/TagsField.vue'
import type { MonitorDialogValues } from '@/components/biz/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 编辑已有监听时的初值；新建时留空 */
    name?: string
    mode?: 'follow_global' | 'algorithm' | 'algorithm_llm'
    intentText?: string
    includeKeywords?: string[]
    excludeKeywords?: string[]
    useGlobalExcludes?: boolean
    matchMode?: 'any' | 'all'
    sensitivity?: 'low' | 'medium' | 'high'
    enabled?: boolean
    actionIds?: string[]
    /** 可选的「指定关联动作」（动作列表由页面给） */
    actions?: { id: string; name: string }[]
    busy?: boolean
    error?: string
  }>(),
  {
    name: '',
    mode: 'follow_global',
    intentText: '',
    includeKeywords: () => [],
    excludeKeywords: () => [],
    useGlobalExcludes: true,
    matchMode: 'any',
    sensitivity: 'medium',
    enabled: true,
    actionIds: () => [],
    actions: () => [],
    busy: false,
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [values: MonitorDialogValues]
  cancel: []
}>()

const { t } = useI18n()

const name = ref(props.name)
const mode = ref<'follow_global' | 'algorithm' | 'algorithm_llm'>(props.mode)
const intentText = ref(props.intentText)
const includeKeywords = ref<string[]>([...props.includeKeywords])
const excludeKeywords = ref<string[]>([...props.excludeKeywords])
const useGlobalExcludes = ref(props.useGlobalExcludes)
const matchMode = ref<'any' | 'all'>(props.matchMode)
const sensitivity = ref<'low' | 'medium' | 'high'>(props.sensitivity)
const enabled = ref(props.enabled)
const actionIds = ref<string[]>([...props.actionIds])

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.name
    mode.value = props.mode
    intentText.value = props.intentText
    includeKeywords.value = [...props.includeKeywords]
    excludeKeywords.value = [...props.excludeKeywords]
    useGlobalExcludes.value = props.useGlobalExcludes
    matchMode.value = props.matchMode
    sensitivity.value = props.sensitivity
    enabled.value = props.enabled
    actionIds.value = [...props.actionIds]
  },
  { immediate: true },
)

const MODES = ['follow_global', 'algorithm', 'algorithm_llm'] as const
const SENSITIVITIES = ['low', 'medium', 'high'] as const

const MATCH_MODES = ['any', 'all'] as const
/** 三个下拉各自的开合（面板内容不进状态） */
const modeOpen = ref(false)
const matchOpen = ref(false)
const sensitivityOpen = ref(false)
const actionsOpen = ref(false)

function toggleAction(id: string): void {
  actionIds.value = actionIds.value.includes(id)
    ? actionIds.value.filter((value) => value !== id)
    : [...actionIds.value, id]
}

/** 已选动作的名字，给触发按钮当摘要 */
const selectedActionNames = computed(() =>
  props.actions
    .filter((action) => actionIds.value.includes(action.id))
    .map((action) => action.name)
    .join('、'),
)

/** 意图描述只在「算法 + LLM」下有用，别的模式不占地方（值留着，切回来还在） */
const needsIntent = computed(() => mode.value === 'algorithm_llm')

const title = computed(() => (props.name ? t('monitor.edit') : t('monitor.add')))

const submitDisabled = computed(() => !name.value.trim())

function submit(): void {
  emit('submit', {
    name: name.value.trim(),
    mode: mode.value,
    intentText: intentText.value.trim(),
    includeKeywords: includeKeywords.value,
    excludeKeywords: excludeKeywords.value,
    useGlobalExcludes: useGlobalExcludes.value,
    matchMode: matchMode.value,
    sensitivity: sensitivity.value,
    enabled: enabled.value,
    actionIds: actionIds.value,
  })
}
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    :busy="busy"
    :error="error"
    :persistent="busy"
    :submit-disabled="submitDisabled"
    :width="640"
    data-test="monitor-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <div class="monitor-dialog__grid">
      <div class="k2-switchrow monitor-dialog__wide">
        <span class="k2-switchrow__main">
          <span class="k2-row__title">{{ t('common.enable') }}</span>
        </span>
        <button
          type="button"
          class="k2-switch"
          :class="{ 'k2-switch--on': enabled }"
          :aria-label="t('common.enable')"
          :aria-pressed="enabled"
          data-test="monitor-dialog-enabled"
          @click="enabled = !enabled"
        >
          <span class="k2-switch__dot" />
        </button>
      </div>

      <AppInput
        v-model="name"
        :label="t('common.name')"
        :maxlength="60"
        required
        data-test="monitor-dialog-name"
      />

      <div class="k2-field">
        <span class="k2-field__label">{{ t('monitor.modeLabel') }}</span>
        <v-menu v-model="modeOpen" :close-on-content-click="true" content-class="k2-menu">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="k2-select"
              :aria-label="t('monitor.modeLabel')"
              data-test="monitor-dialog-mode"
            >
              <span>{{ t(`monitor.mode.${mode}`) }}</span>
              <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <button
            v-for="value in MODES"
            :key="value"
            type="button"
            class="k2-menu__item"
            @click="mode = value"
          >
            <v-icon size="18">
              {{ value === mode ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
            {{ t(`monitor.mode.${value}`) }}
          </button>
        </v-menu>
      </div>

      <label v-if="needsIntent" class="k2-field monitor-dialog__wide">
        <span class="k2-field__label">{{ t('monitor.intent') }}</span>
        <textarea
          v-model="intentText"
          class="k2-textarea"
          :maxlength="500"
          data-test="monitor-dialog-intent"
        />
        <span class="k2-field__hint">{{ t('monitor.intentHint') }}</span>
      </label>

      <TagsField
        v-model="includeKeywords"
        class="monitor-dialog__wide"
        :label="t('monitor.keywords')"
        :hint="t('monitor.keywordsHint')"
        data-test="monitor-dialog-keywords"
      />

      <div class="k2-field">
        <span class="k2-field__label">{{ t('monitor.matchModeLabel') }}</span>
        <v-menu v-model="matchOpen" :close-on-content-click="true" content-class="k2-menu">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="k2-select"
              :aria-label="t('monitor.matchModeLabel')"
              data-test="monitor-dialog-match-mode"
            >
              <span>{{ t(`monitor.matchMode.${matchMode}`) }}</span>
              <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <button
            v-for="value in MATCH_MODES"
            :key="value"
            type="button"
            class="k2-menu__item"
            @click="matchMode = value"
          >
            <v-icon size="18">
              {{ value === matchMode ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
            {{ t(`monitor.matchMode.${value}`) }}
          </button>
        </v-menu>
      </div>

      <div class="k2-field">
        <span class="k2-field__label">{{ t('monitor.sensitivityLabel') }}</span>
        <v-menu v-model="sensitivityOpen" :close-on-content-click="true" content-class="k2-menu">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="k2-select"
              :aria-label="t('monitor.sensitivityLabel')"
              data-test="monitor-dialog-sensitivity"
            >
              <span>{{ t(`monitor.sensitivity.${sensitivity}`) }}</span>
              <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <button
            v-for="value in SENSITIVITIES"
            :key="value"
            type="button"
            class="k2-menu__item"
            @click="sensitivity = value"
          >
            <v-icon size="18">
              {{ value === sensitivity ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
            {{ t(`monitor.sensitivity.${value}`) }}
          </button>
        </v-menu>
      </div>

      <TagsField
        v-model="excludeKeywords"
        class="monitor-dialog__wide"
        :label="t('monitor.excludeKeywords')"
        data-test="monitor-dialog-excludes"
      />

      <div class="k2-switchrow monitor-dialog__wide">
        <span class="k2-switchrow__main">
          <span class="k2-row__title">{{ t('monitor.useGlobalExcludes') }}</span>
        </span>
        <button
          type="button"
          class="k2-switch"
          :class="{ 'k2-switch--on': useGlobalExcludes }"
          :aria-label="t('monitor.useGlobalExcludes')"
          :aria-pressed="useGlobalExcludes"
          data-test="monitor-dialog-global-excludes"
          @click="useGlobalExcludes = !useGlobalExcludes"
        >
          <span class="k2-switch__dot" />
        </button>
      </div>

      <div class="k2-field monitor-dialog__wide">
        <span class="k2-field__label">{{ t('monitor.onlyActionsLabel') }}</span>
        <span class="k2-inputwrap" :class="{ 'is-clearable': actionIds.length > 0 }">
          <v-menu v-model="actionsOpen" :close-on-content-click="false" content-class="k2-menu">
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="k2-select"
                :aria-label="t('monitor.onlyActionsLabel')"
                data-test="monitor-dialog-actions"
              >
                <span :class="{ 'k2-select__ph': actionIds.length === 0 }">
                  {{ actionIds.length > 0 ? selectedActionNames : t('monitor.followGroup') }}
                </span>
                <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
              </button>
            </template>
            <button
              v-for="action in actions"
              :key="action.id"
              type="button"
              class="k2-menu__item"
              @click="toggleAction(action.id)"
            >
              <v-icon size="18">
                {{
                  actionIds.includes(action.id)
                    ? 'mdi-checkbox-marked'
                    : 'mdi-checkbox-blank-outline'
                }}
              </v-icon>
              {{ action.name }}
            </button>
          </v-menu>
          <button
            v-if="actionIds.length > 0"
            type="button"
            class="k2-inputwrap__clear"
            :aria-label="t('common.clear')"
            data-test="monitor-dialog-actions-clear"
            @click="actionIds = []"
          >
            <v-icon size="16">mdi-close-circle</v-icon>
          </button>
        </span>
      </div>
    </div>
  </FormDialog>
</template>

<style scoped>
/* 字段成对的地方并成两列，窄屏自动回到一列；整行的那些（开关、标签输入、意图描述）跨满两列 */
.monitor-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--k2-s-5);
}

@media (min-width: 900px) {
  .monitor-dialog__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .monitor-dialog__wide {
    grid-column: 1 / -1;
  }
}
</style>
