<!-- SourceDialog：数据源（发现）的填表弹窗（业务组件层，v2 零件）。
     类型在弹窗里选：三种类型共用「启用 + 名称 + 目标 + 采集频率」这套骨架，目标那栏随类型变。
     RSSHub 全站共用一个实例：
       · 没配实例地址 → 下拉里这一项灰着，点它不是选类型、而是去配置（出事件，页面负责跳转）；
       · 配了 → 把它当地址前缀挂在路由输入框前面；前缀只展示，保存的还是路由本身（后端拼前缀）。
     只出事件，不碰 store、不发请求。 -->
<script setup lang="ts">
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
    /** 全局设置里的 RSSHub 实例地址；空字符串＝还没配 */
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
  configureRsshub: []
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

const rsshubConfigured = computed(() => props.rsshubBaseUrl.trim().length > 0)
/** 前缀去掉末尾斜杠后展示；后端拼地址时也这么处理 */
const rsshubPrefix = computed(() => props.rsshubBaseUrl.trim().replace(/\/+$/, ''))

function kindLabel(value: Kind): string {
  return t(`discovery.kind.${value}`)
}

/** RSSHub 没配时点这一项＝去配置，不选类型 */
function pickKind(value: Kind): void {
  if (value === 'rsshub' && !rsshubConfigured.value) {
    emit('configureRsshub')
    return
  }
  kind.value = value
}

/** 只有配了实例、且目标填了，才拿得到完整地址 */
const prefix = computed(() =>
  kind.value === 'rsshub' && rsshubConfigured.value ? rsshubPrefix.value : '',
)

const title = computed(() => (props.name ? t('discovery.editSource') : t('discovery.addSource')))

const submitDisabled = computed(() => {
  const targetReady =
    kind.value === 'rsshub'
      ? rsshubConfigured.value && target.value.trim().length > 0
      : target.value.trim().length > 0
  return !name.value.trim() || !targetReady || !checkCron(cron.value).ok
})

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
          :class="{ 'k2-menu__item--muted': value === 'rsshub' && !rsshubConfigured }"
          data-test="source-dialog-kind-item"
          @click="pickKind(value)"
        >
          <v-icon size="18">
            {{ value === kind ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
          </v-icon>
          {{ kindLabel(value) }}
          <span v-if="value === 'rsshub' && !rsshubConfigured" class="k2-menu__hint">
            {{ t('discovery.goConfigure') }}
          </span>
        </button>
      </v-menu>
    </div>

    <AppInput
      v-model="target"
      :label="t(`discovery.targetLabel.${kind}`)"
      :hint="t(`discovery.targetHint.${kind}`)"
      :prefix="prefix"
      mono
      :maxlength="1000"
      required
      data-test="source-dialog-target"
    />

    <CronPicker v-model="cron" :label="t('discovery.frequency')" data-test="source-dialog-cron" />
  </FormDialog>
</template>
