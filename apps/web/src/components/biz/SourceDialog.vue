<!-- SourceDialog：数据源（发现）的填表弹窗（业务组件层）。
     类型在弹窗里选：三种类型共用「名称 + 目标 + 采集频率」这套骨架，目标那栏随类型变。
     RSSHub 全站共用一个实例：
       · 没配实例地址 → 下拉里这一项灰掉不可选，右侧挂一个「前往配置」的入口（点它出事件，页面负责跳转）；
       · 配了 → 把它当地址前缀挂在路由输入框前面；前缀只展示，保存的还是路由本身（后端拼前缀）。
     只出事件，不碰 store、不发请求。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import type { SourceDialogValues } from '@/components/biz/types'
import { checkCron } from '@/utils/cron'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 编辑已有数据源时的初值；新建时留空 */
    name?: string
    kind?: 'rsshub' | 'rss' | 'web'
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
const kind = ref<'rsshub' | 'rss' | 'web'>(props.kind)
const target = ref(props.target)
const cron = ref(props.cron)
const enabled = ref(props.enabled)

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

const kindItems = computed(() => [
  {
    title: t('discovery.kind.rsshub'),
    value: 'rsshub',
    props: { disabled: !rsshubConfigured.value },
  },
  { title: t('discovery.kind.rss'), value: 'rss' },
  { title: t('discovery.kind.web'), value: 'web' },
])

/** 下拉项取值/取标题：Vuetify 给的 item 是原样对象，类型上可能是裸字符串，这里两种都兜住 */
function itemValue(item: unknown): string {
  return typeof item === 'object' && item !== null && 'value' in item
    ? String((item as { value: unknown }).value)
    : String(item)
}

function itemTitle(item: unknown): string {
  return typeof item === 'object' && item !== null && 'title' in item
    ? String((item as { title: unknown }).title)
    : String(item)
}

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
    <div class="app-stack">
      <AppSwitch v-model="enabled" :label="t('common.enable')" data-test="source-dialog-enabled" />

      <AppInput v-model="name" :label="t('common.name')" required data-test="source-dialog-name" />

      <AppSelect
        v-model="kind"
        :label="t('discovery.kindLabel')"
        :items="kindItems"
        data-test="source-dialog-kind"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps">
            <template #title>
              <span class="source-dialog__kind" data-test="source-dialog-kind-item">
                <span>{{ itemTitle(item) }}</span>
                <AppStatus
                  v-if="itemValue(item) === 'rsshub' && !rsshubConfigured"
                  tone="info"
                  :dot="false"
                  action
                  data-test="source-dialog-rsshub-configure"
                  @click.stop="emit('configureRsshub')"
                >
                  {{ t('discovery.goConfigure') }}
                </AppStatus>
              </span>
            </template>
          </v-list-item>
        </template>
      </AppSelect>

      <AppInput
        v-model="target"
        mono
        required
        :label="t('discovery.target')"
        :hint="t(`discovery.targetHint.${kind}`)"
        :prefix="kind === 'rsshub' && rsshubConfigured ? rsshubPrefix : undefined"
        data-test="source-dialog-target"
      />

      <CronPicker v-model="cron" :label="t('discovery.frequency')" data-test="source-dialog-cron" />
    </div>
  </FormDialog>
</template>

<style scoped>
/* 下拉项：标题在左，动作在右；只有这一处排版属于弹窗自己 */
.source-dialog__kind {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--k-space-3);
  width: 100%;
}
</style>
