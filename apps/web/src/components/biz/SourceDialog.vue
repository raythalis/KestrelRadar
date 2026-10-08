<!-- SourceDialog：发现的填表弹窗；RSSHub 地址留空时展示默认前缀，只保存相对路由。 -->
<script setup lang="ts">
import { RSSHUB_DEFAULT_BASE_URL, isValidDiscoveryTarget } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import type { SourceDialogValues } from '@/components/biz/types'
import { checkCron } from '@/utils/cron'

const KINDS = ['rsshub', 'rss', 'web'] as const
type Kind = (typeof KINDS)[number]

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 编辑已有数据源时的初值；新建时留空 */
    name?: string
    kind?: Kind
    target?: string
    cron?: string
    enabled?: boolean
    /** 全局设置里的 RSSHub 实例地址；空字符串＝使用默认地址 */
    rsshubBaseUrl?: string
    busy?: boolean
    error?: string
  }>(),
  {
    name: '',
    kind: 'rsshub',
    target: '',
    cron: '0 * * * *',
    enabled: true,
    rsshubBaseUrl: '',
    busy: false,
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [values: SourceDialogValues]
  cancel: []
}>()

const { t } = useI18n()

const name = ref(props.name)
const kind = ref<Kind>(props.kind)
const target = ref(props.target)
const cron = ref(props.cron)
const enabled = ref(props.enabled)

/** 类型面板开着没有；选项本身不进状态 */
const kindOpen = ref(false)

/** 目标形状：rss / web 必须是 http(s) 地址，rsshub 还允许相对路由 */
const targetInvalid = computed(
  () => target.value.trim() !== '' && !isValidDiscoveryTarget(target.value, kind.value),
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.name
    kind.value = props.kind
    target.value = props.target
    cron.value = props.cron
    enabled.value = props.enabled
  },
  { immediate: true },
)

/** 只展示实际使用的前缀，保存时仍只提交相对路由。 */
const rsshubPrefix = computed(() =>
  (props.rsshubBaseUrl.trim() || RSSHUB_DEFAULT_BASE_URL).replace(/\/+$/, ''),
)

function kindLabel(value: Kind): string {
  return t(`discovery.kind.${value}`)
}

/** 前后缀只在 RSSHub 路由这一档显示 */
const prefix = computed(() => (kind.value === 'rsshub' ? rsshubPrefix.value : ''))

const title = computed(() => (props.name ? t('discovery.editSource') : t('discovery.addSource')))

// RSSHub 实例地址可留空（实际使用默认地址），这里只要路由栏填了就算就绪
const submitDisabled = computed(
  () =>
    !name.value.trim() || !target.value.trim() || targetInvalid.value || !checkCron(cron.value).ok,
)

function submit(): void {
  emit('submit', {
    name: name.value.trim(),
    kind: kind.value,
    target: target.value.trim(),
    cronExpression: cron.value.trim(),
    enabled: enabled.value,
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
    :width="520"
    data-test="source-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <div class="k2-switchrow">
      <span class="k2-switchrow__main">
        <span class="k2-row__title">{{ t('common.enable') }}</span>
      </span>
      <button
        type="button"
        class="k2-switch"
        :class="{ 'k2-switch--on': enabled }"
        :aria-label="t('common.enable')"
        :aria-pressed="enabled"
        data-test="source-dialog-enabled"
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
      data-test="source-dialog-name"
    />

    <div class="k2-field">
      <span class="k2-field__label">{{ t('discovery.kindLabel') }}</span>
      <v-menu v-model="kindOpen" :close-on-content-click="true" content-class="k2-menu">
        <template #activator="{ props: menuProps }">
          <button
            v-bind="menuProps"
            type="button"
            class="k2-select"
            :aria-label="t('discovery.kindLabel')"
            data-test="source-dialog-kind"
          >
            <span>{{ kindLabel(kind) }}</span>
            <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
          </button>
        </template>
        <button
          v-for="value in KINDS"
          :key="value"
          type="button"
          class="k2-menu__item"
          data-test="source-dialog-kind-item"
          @click="kind = value"
        >
          <v-icon size="18">
            {{ value === kind ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
          </v-icon>
          {{ kindLabel(value) }}
        </button>
      </v-menu>
    </div>

    <AppInput
      v-model="target"
      :label="t(`discovery.targetLabel.${kind}`)"
      :hint="targetInvalid ? t('discovery.targetInvalid') : t(`discovery.targetHint.${kind}`)"
      :error="targetInvalid ? t('discovery.targetInvalid') : undefined"
      :prefix="prefix"
      mono
      :maxlength="1000"
      required
      data-test="source-dialog-target"
    />

    <CronPicker v-model="cron" :label="t('discovery.frequency')" data-test="source-dialog-cron" />
  </FormDialog>
</template>
