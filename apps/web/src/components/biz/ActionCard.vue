<!-- ActionCard：投递动作卡片（业务组件层）。
     状态：正常 / 定时汇总（带 cron）/ 缺渠道(warn) / 停用 / 不可用。
     只出事件，不碰 store。 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    name: string
    /** 触发方式文案（实时推送 / 定时汇总） */
    triggerLabel: string
    /** 图标（mdi-xxx），默认按触发方式给 */
    icon?: string
    /** 定时汇总时的 cron 表达式 */
    cronExpression?: string
    /** 目标渠道名；缺了就是没配 */
    channelName?: string
    /** 消息模板名 */
    templateName?: string
    enabled: boolean
    /** 被几个监听引用 */
    referencedCount?: number
    busy?: boolean
    disabled?: boolean
  }>(),
  { icon: 'mdi-bell-ring-outline', referencedCount: 0, busy: false, disabled: false },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  delete: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="biz-card"
    :class="[
      `biz-card--${channelName ? 'ok' : 'warn'}`,
      { 'is-off': !enabled, 'is-disabled': disabled },
    ]"
    :role="disabled ? undefined : 'button'"
    :tabindex="disabled ? undefined : 0"
    data-test="action-card"
    @click="disabled ? undefined : emit('edit')"
    @keydown.enter.prevent="disabled ? undefined : emit('edit')"
  >
    <div class="biz-card__head">
      <span class="biz-card__icon" data-test="action-icon">
        <v-icon size="18">{{ icon }}</v-icon>
      </span>
      <span class="biz-card__heading">
        <span class="biz-card__title" data-test="action-name">{{ name }}</span>
        <span class="biz-card__kind" data-test="action-trigger">{{ triggerLabel }}</span>
      </span>
      <span class="app-spacer" />
      <span @click.stop>
        <AppSwitch
          :model-value="enabled"
          :disabled="disabled"
          :aria-label="enabled ? t('common.enabled') : t('common.disabled')"
          data-test="action-enabled"
          @update:model-value="(value: boolean) => emit('toggle', value)"
        />
      </span>
    </div>

    <div class="biz-card__body">
      <span v-if="cronExpression" class="biz-card__sub biz-card__sub--mono" data-test="action-cron">
        {{ cronExpression }}
      </span>
      <span class="biz-card__sub" data-test="action-channel">{{
        channelName || t('action.channelMissing')
      }}</span>
      <span v-if="templateName" class="biz-card__meta" data-test="action-template">{{
        templateName
      }}</span>
      <AppHint v-if="!channelName" tone="warn" data-test="action-warning">
        {{ t('action.channelMissingHint') }}
      </AppHint>
    </div>

    <div class="biz-card__foot">
      <span class="biz-card__meta" data-test="action-referenced">
        {{ t('action.referencedBy', { n: referencedCount }) }}
      </span>
      <span class="app-spacer" />
      <AppButton
        size="sm"
        variant="ghost"
        :loading="busy"
        :disabled="disabled"
        data-test="action-edit"
        @click.stop="emit('edit')"
      >
        {{ t('common.edit') }}
      </AppButton>
      <AppButton
        size="sm"
        variant="danger"
        :disabled="disabled"
        data-test="action-delete"
        @click.stop="emit('delete')"
      >
        {{ t('common.delete') }}
      </AppButton>
    </div>
  </div>
</template>
