<!-- ActionDialog：动作的填表弹窗（业务组件层）。
     字段按「这条动作什么时候发、发到哪、发成什么样」排：
       启用 → 名称 + 触发方式 →（汇总时才有）汇总时间 → 通知渠道 + 消息模板
       → 合并为一条消息（+ 汇总时的「包含已即时推送过的内容」）
     选择项都由页面传进来（渠道、模板），只出事件，不碰 store。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import AppStatus from '@/components/app/AppStatus.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import type { ChannelType } from '@kestrel/contracts'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import { CHANNEL_ICONS } from '@/components/biz/icons'
import type { ActionDialogValues, ActionTrigger } from '@/components/biz/types'
import { checkCron } from '@/utils/cron'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 空名字＝新建（标题用「添加动作」，否则「编辑动作」） */
    name?: string
    triggerType?: ActionTrigger
    cron?: string
    /** 目标渠道 id；空＝还没选 */
    channelId?: string
    /** 消息模板 id；空＝系统内置（默认模板） */
    templateId?: string
    mergeMessages?: boolean
    includeDelivered?: boolean
    enabled?: boolean
    /** 可选渠道（真页面拿渠道列表）；带上类型与启用状态，下拉里要画图标、标「未启用」 */
    channels?: { id: string; name: string; type: ChannelType; enabled: boolean }[]
    /** 可选模板；系统内置那一项由弹窗自己加 */
    templates?: { id: string; name: string }[]
    busy?: boolean
    error?: string
  }>(),
  {
    name: '',
    triggerType: 'instant',
    cron: '',
    channelId: '',
    templateId: '',
    mergeMessages: true,
    includeDelivered: false,
    enabled: true,
    channels: () => [],
    templates: () => [],
    busy: false,
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  submit: [values: ActionDialogValues]
  cancel: []
}>()

const { t } = useI18n()

const name = ref('')
const triggerType = ref<ActionTrigger>('instant')
const cron = ref('')
const channelId = ref('')
const templateId = ref('')
const mergeMessages = ref(true)
const includeDelivered = ref(false)
const enabled = ref(true)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.name
    triggerType.value = props.triggerType
    cron.value = props.cron
    channelId.value = props.channelId
    templateId.value = props.templateId
    mergeMessages.value = props.mergeMessages
    includeDelivered.value = props.includeDelivered
    enabled.value = props.enabled
  },
  { immediate: true },
)

const triggerItems = computed(() => [
  { title: t('action.trigger.instant'), value: 'instant' },
  { title: t('action.trigger.digest'), value: 'digest' },
])
const channelItems = computed(() =>
  props.channels.map((channel) => ({
    title: channel.name,
    value: channel.id,
    type: channel.type,
    enabled: channel.enabled,
  })),
)

/** 下拉项里要拿回自己塞的字段（Vuetify 把原对象放在 raw 里） */
function itemRaw(item: unknown): { type?: ChannelType; enabled?: boolean } {
  const raw = (
    typeof item === 'object' && item !== null && 'raw' in item
      ? (item as { raw: unknown }).raw
      : item
  ) as { type?: ChannelType; enabled?: boolean } | null
  return raw && typeof raw === 'object' ? raw : {}
}
/** 系统内置那一项用空串占位，交出去的时候换回 null */
const templateItems = computed(() => [
  { title: t('action.templateBuiltin'), value: '' },
  ...props.templates.map((template) => ({ title: template.name, value: template.id })),
])

/** 只有汇总动作才有发送时间和「包含已即时推送过的内容」 */
const isDigest = computed(() => triggerType.value === 'digest')

const cronInvalid = computed(() => isDigest.value && !checkCron(cron.value).ok)

const title = computed(() => (props.name ? t('action.edit') : t('action.add')))

const submitDisabled = computed(() => !name.value.trim() || !channelId.value || cronInvalid.value)

function submit(): void {
  emit('submit', {
    name: name.value.trim(),
    triggerType: triggerType.value,
    cron: isDigest.value ? cron.value.trim() : null,
    channelId: channelId.value,
    templateId: templateId.value || null,
    mergeMessages: mergeMessages.value,
    includeDelivered: includeDelivered.value,
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
    :width="640"
    data-test="action-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <div class="action-dialog__grid">
      <AppSwitch
        v-model="enabled"
        class="action-dialog__wide"
        :label="t('common.enable')"
        data-test="action-dialog-enabled"
      />

      <AppInput v-model="name" :label="t('common.name')" required data-test="action-dialog-name" />

      <AppSelect
        v-model="triggerType"
        :label="t('action.triggerLabel')"
        :items="triggerItems"
        data-test="action-dialog-trigger"
      />

      <CronPicker
        v-if="isDigest"
        v-model="cron"
        class="action-dialog__wide"
        :label="t('action.digestTime')"
        data-test="action-dialog-cron"
      />

      <AppSelect
        v-model="channelId"
        :label="t('action.channelLabel')"
        :items="channelItems"
        data-test="action-dialog-channel"
      >
        <!-- 左边图标标渠道类型，右边标出还没启用的渠道（这种动作打不出去） -->
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps">
            <template #prepend>
              <v-icon size="18" data-test="action-dialog-channel-icon">
                {{ itemRaw(item).type ? CHANNEL_ICONS[itemRaw(item).type as ChannelType] : '' }}
              </v-icon>
            </template>
            <template #append>
              <AppStatus
                v-if="itemRaw(item).enabled === false"
                tone="err"
                data-test="action-dialog-channel-off"
              >
                {{ t('action.channelDisabled') }}
              </AppStatus>
            </template>
          </v-list-item>
        </template>
      </AppSelect>

      <AppSelect
        v-model="templateId"
        :label="t('action.template')"
        :items="templateItems"
        data-test="action-dialog-template"
      />

      <AppSwitch
        v-model="mergeMessages"
        :label="t('action.mergeMessages')"
        data-test="action-dialog-merge"
      />

      <AppSwitch
        v-if="isDigest"
        v-model="includeDelivered"
        :label="t('action.includeDelivered')"
        data-test="action-dialog-include-delivered"
      />
    </div>
  </FormDialog>
</template>

<style scoped>
/* 跟监听弹窗同一套排法：成对的并排、长的跨满两列，窄屏回到一列 */
.action-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--k-space-4);
}

@media (min-width: 900px) {
  .action-dialog__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-dialog__wide {
    grid-column: 1 / -1;
  }
}
</style>
