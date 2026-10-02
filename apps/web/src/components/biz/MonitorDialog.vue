<!-- MonitorDialog：监听的填表弹窗（业务组件层）。
     字段按「这条监听什么时候算命中、命中了怎么走」排：
       启用 → 名称 → 模式 →（算法 + LLM 时才有）意图描述 → 关键词 + 匹配方式 → 排除词（可追加全局排除词）
       → 灵敏度 → 只走这几个动作（留空＝跟随分组）。
     互动：关键词/排除词用标签输入；「只走这几个动作」是多选，留空就是跟随分组，不另外写解释。
     只出事件，不碰 store、不发请求。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import AppTagsInput from '@/components/app/AppTagsInput.vue'
import AppTextarea from '@/components/app/AppTextarea.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
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
    /** 可选的「只走这几个动作」（动作列表由页面给） */
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

const modeItems = computed(() =>
  MODES.map((value) => ({ title: t(`monitor.mode.${value}`), value })),
)
const sensitivityItems = computed(() =>
  SENSITIVITIES.map((value) => ({ title: t(`monitor.sensitivity.${value}`), value })),
)
const matchModeItems = computed(() => [
  { title: t('monitor.matchMode.any'), value: 'any' },
  { title: t('monitor.matchMode.all'), value: 'all' },
])
const actionItems = computed(() =>
  props.actions.map((action) => ({ title: action.name, value: action.id })),
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
      <AppSwitch
        v-model="enabled"
        class="monitor-dialog__wide"
        :label="t('common.enable')"
        data-test="monitor-dialog-enabled"
      />

      <AppInput v-model="name" :label="t('common.name')" required data-test="monitor-dialog-name" />

      <AppSelect
        v-model="mode"
        :label="t('monitor.modeLabel')"
        :items="modeItems"
        data-test="monitor-dialog-mode"
      />

      <AppTextarea
        v-if="needsIntent"
        v-model="intentText"
        class="monitor-dialog__wide"
        :label="t('monitor.intent')"
        :hint="t('monitor.intentHint')"
        :maxlength="500"
        data-test="monitor-dialog-intent"
      />

      <AppTagsInput
        v-model="includeKeywords"
        class="monitor-dialog__wide"
        :label="t('monitor.keywords')"
        :hint="t('monitor.keywordsHint')"
        data-test="monitor-dialog-keywords"
      />

      <AppSelect
        v-model="matchMode"
        :label="t('monitor.matchModeLabel')"
        :items="matchModeItems"
        data-test="monitor-dialog-match-mode"
      />

      <AppSelect
        v-model="sensitivity"
        :label="t('monitor.sensitivityLabel')"
        :items="sensitivityItems"
        data-test="monitor-dialog-sensitivity"
      />

      <AppTagsInput
        v-model="excludeKeywords"
        class="monitor-dialog__wide"
        :label="t('monitor.excludeKeywords')"
        data-test="monitor-dialog-excludes"
      />

      <AppSwitch
        v-model="useGlobalExcludes"
        class="monitor-dialog__wide"
        :label="t('monitor.useGlobalExcludes')"
        data-test="monitor-dialog-global-excludes"
      />

      <AppSelect
        v-model="actionIds"
        multiple
        class="monitor-dialog__wide"
        :label="t('monitor.onlyActionsLabel')"
        :hint="t('monitor.onlyActionsHint')"
        :items="actionItems"
        data-test="monitor-dialog-actions"
      />
    </div>
  </FormDialog>
</template>

<style scoped>
/* 字段成对的地方并成两列，窄屏自动回到一列；整行的那些（开关、标签输入、意图描述）跨满两列 */
.monitor-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--k-space-4);
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
