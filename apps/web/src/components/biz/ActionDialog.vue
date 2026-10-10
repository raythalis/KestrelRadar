<!-- ActionDialog：动作的填表弹窗（业务组件层，v2 零件）。
     字段按「这条动作什么时候发、发到哪、发成什么样」排：
       启用 → 名称 + 触发方式 →（汇总时才有）汇总时间 → 通知渠道 + 消息模板
       → 合并为一条消息（+ 汇总时的「包含已即时推送过的内容」）
     选择项都由页面传进来（渠道、模板），只出事件，不碰 store。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChannelType } from '@kestrel/contracts'

import AppInput from '@/components/app/AppInput.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import ChannelIcon from '@/components/biz/ChannelIcon.vue'
import type { ActionDialogValues, ActionTrigger } from '@/components/biz/types'
import { checkCron } from '@/utils/cron'

const TRIGGERS = ['instant', 'digest'] as const

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
  /** 渠道下拉里点了「新建通知渠道」：具体怎么开由页面定 */
  'new-channel': []
  cancel: []
}>()

const { t } = useI18n()

const name = ref(props.name)
const triggerType = ref<ActionTrigger>(props.triggerType)
const cron = ref(props.cron)
const channelId = ref(props.channelId)
const templateId = ref(props.templateId)
const mergeMessages = ref(props.mergeMessages)
const includeDelivered = ref(props.includeDelivered)
const enabled = ref(props.enabled)

/** 各下拉自己的开合；选项本身不进状态 */
const triggerOpen = ref(false)
const channelOpen = ref(false)
const templateOpen = ref(false)

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

/** 触发按钮上的渠道摘要；没选就空着（用占位色） */
const selectedChannel = computed(() =>
  props.channels.find((channel) => channel.id === channelId.value),
)
const channelSummary = computed(() => selectedChannel.value?.name ?? '')

/** 系统内置那一项用空串占位，交出去的时候换回 null */
const templateSummary = computed(() =>
  props.templates.find((template) => template.id === templateId.value)
    ? (props.templates.find((template) => template.id === templateId.value)?.name ?? '')
    : t('action.templateBuiltin'),
)

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
      <div class="k2-switchrow action-dialog__wide">
        <span class="k2-switchrow__main">
          <span class="k2-row__title">{{ t('common.enable') }}</span>
        </span>
        <button
          type="button"
          class="k2-switch"
          :class="{ 'k2-switch--on': enabled }"
          :aria-label="t('common.enable')"
          :aria-pressed="enabled"
          data-test="action-dialog-enabled"
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
        data-test="action-dialog-name"
      />

      <div class="k2-field">
        <span class="k2-field__label">{{ t('action.triggerLabel') }}</span>
        <v-menu v-model="triggerOpen" :close-on-content-click="true" content-class="k2-menu">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="k2-select"
              :aria-label="t('action.triggerLabel')"
              data-test="action-dialog-trigger"
            >
              <span>{{ t(`action.trigger.${triggerType}`) }}</span>
              <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <button
            v-for="value in TRIGGERS"
            :key="value"
            type="button"
            class="k2-menu__item"
            @click="triggerType = value"
          >
            <v-icon size="18">
              {{ value === triggerType ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
            {{ t(`action.trigger.${value}`) }}
          </button>
        </v-menu>
      </div>

      <CronPicker
        v-if="isDigest"
        v-model="cron"
        class="action-dialog__wide"
        :label="t('action.digestTime')"
        data-test="action-dialog-cron"
      />

      <div class="k2-field">
        <span class="k2-field__label">{{ t('action.channelLabel') }}</span>
        <v-menu v-model="channelOpen" :close-on-content-click="true" content-class="k2-menu">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="k2-select"
              :aria-label="t('action.channelLabel')"
              data-test="action-dialog-channel"
            >
              <span class="k2-card__row">
                <ChannelIcon
                  v-if="selectedChannel"
                  :type="selectedChannel.type"
                  data-test="action-dialog-channel-icon"
                />
                <span :class="{ 'k2-select__ph': !channelSummary }">
                  {{ channelSummary || t('action.channelMissing') }}
                </span>
              </span>
              <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <button
            v-for="channel in channels"
            :key="channel.id"
            type="button"
            class="k2-menu__item"
            @click="channelId = channel.id"
          >
            <ChannelIcon :type="channel.type" data-test="action-dialog-channel-icon" />
            {{ channel.name }}
            <span v-if="!channel.enabled" class="k2-menu__hint">
              <span class="k2-chip k2-t-danger" data-test="action-dialog-channel-off">
                {{ t('action.channelDisabled') }}
              </span>
            </span>
          </button>
          <hr class="k2-menu__sep" />
          <button
            type="button"
            class="k2-menu__item k2-menu__item--accent"
            data-test="action-dialog-new-channel"
            @click="emit('new-channel')"
          >
            <v-icon size="18">mdi-plus-circle-outline</v-icon>{{ t('action.newChannel') }}
          </button>
        </v-menu>
      </div>

      <div class="k2-field">
        <span class="k2-field__label">{{ t('action.template') }}</span>
        <v-menu v-model="templateOpen" :close-on-content-click="true" content-class="k2-menu">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="k2-select"
              :aria-label="t('action.template')"
              data-test="action-dialog-template"
            >
              <span>{{ templateSummary }}</span>
              <v-icon size="18" class="k2-select__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <button type="button" class="k2-menu__item" @click="templateId = ''">
            <v-icon size="18">
              {{ templateId === '' ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
            {{ t('action.templateBuiltin') }}
          </button>
          <button
            v-for="template in templates"
            :key="template.id"
            type="button"
            class="k2-menu__item"
            @click="templateId = template.id"
          >
            <v-icon size="18">
              {{ templateId === template.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
            {{ template.name }}
          </button>
        </v-menu>
      </div>

      <div class="k2-switchrow action-dialog__wide">
        <span class="k2-switchrow__main">
          <span class="k2-row__title">{{ t('action.mergeMessages') }}</span>
        </span>
        <button
          type="button"
          class="k2-switch"
          :class="{ 'k2-switch--on': mergeMessages }"
          :aria-label="t('action.mergeMessages')"
          :aria-pressed="mergeMessages"
          data-test="action-dialog-merge"
          @click="mergeMessages = !mergeMessages"
        >
          <span class="k2-switch__dot" />
        </button>
      </div>

      <div v-if="isDigest" class="k2-switchrow action-dialog__wide">
        <span class="k2-switchrow__main">
          <span class="k2-row__title">{{ t('action.includeDelivered') }}</span>
        </span>
        <button
          type="button"
          class="k2-switch"
          :class="{ 'k2-switch--on': includeDelivered }"
          :aria-label="t('action.includeDelivered')"
          :aria-pressed="includeDelivered"
          data-test="action-dialog-include-delivered"
          @click="includeDelivered = !includeDelivered"
        >
          <span class="k2-switch__dot" />
        </button>
      </div>
    </div>
  </FormDialog>
</template>

<style scoped>
/* 跟监听弹窗同一套排法：成对的并排、长的跨满两列，窄屏回到一列 */
.action-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--k2-s-5);
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
