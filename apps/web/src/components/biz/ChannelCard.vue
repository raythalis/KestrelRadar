<!-- ChannelCard：通知渠道卡片（业务组件层）。
     状态：正常 / 停用 / 连通(ok) / 有警告(warn) / 不通(err) / 未测(neutral) / 测试中(busy) / 被 N 个动作引用。
     只出事件，不碰 store：数据与写操作由页面负责。 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    name: string
    /** 渠道类型文案（Telegram / 企业微信 …） */
    kindLabel: string
    /** 渠道图标（mdi-xxx），由页面按渠道类型给 */
    icon?: string
    enabled: boolean
    /** 连通状态 */
    tone?: 'ok' | 'warn' | 'err' | 'neutral'
    statusText: string
    /** 一行细节：目标会话 / 群 ID（页面负责脱敏） */
    detail?: string
    /** 上次验证时间（已格式化） */
    verifiedAt?: string
    /** 被几个动作引用；0 表示还没人用 */
    usedBy?: number
    /** 正在测试连通性 */
    busy?: boolean
    /** 没有权限时整卡不可点 */
    disabled?: boolean
  }>(),
  { icon: 'mdi-send-outline', tone: 'neutral', usedBy: 0, busy: false, disabled: false },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  test: []
  delete: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="biz-card"
    :class="[`biz-card--${tone}`, { 'is-off': !enabled, 'is-disabled': disabled }]"
    :role="disabled ? undefined : 'button'"
    :tabindex="disabled ? undefined : 0"
    data-test="channel-card"
    @click="disabled ? undefined : emit('edit')"
    @keydown.enter.prevent="disabled ? undefined : emit('edit')"
  >
    <div class="biz-card__head">
      <span class="biz-card__icon" data-test="channel-icon">
        <v-icon size="18">{{ icon }}</v-icon>
      </span>
      <span class="biz-card__heading">
        <span class="biz-card__title" data-test="channel-name">{{ name }}</span>
        <span class="biz-card__kind" data-test="channel-kind">{{ kindLabel }}</span>
      </span>
      <span class="app-spacer" />
      <span @click.stop>
        <AppSwitch
          :model-value="enabled"
          :disabled="disabled"
          :aria-label="enabled ? t('common.enabled') : t('common.disabled')"
          data-test="channel-enabled"
          @update:model-value="(value: boolean) => emit('toggle', value)"
        />
      </span>
    </div>

    <div class="biz-card__body">
      <AppStatus :tone="tone" :busy="busy" data-test="channel-status">{{ statusText }}</AppStatus>
      <span v-if="detail" class="biz-card__sub" data-test="channel-detail">{{ detail }}</span>
    </div>

    <div class="biz-card__foot">
      <span class="biz-card__meta" data-test="channel-used-by">
        {{ t('channel.usedBy', { n: usedBy }) }}
      </span>
      <span v-if="verifiedAt" class="biz-card__meta" data-test="channel-verified">
        {{ t('channel.verifiedAt', { time: verifiedAt }) }}
      </span>
      <span class="app-spacer" />
      <AppButton
        size="sm"
        variant="ghost"
        :loading="busy"
        :disabled="disabled"
        data-test="channel-test"
        @click.stop="emit('test')"
      >
        {{ t('channel.test') }}
      </AppButton>
      <AppButton
        size="sm"
        variant="ghost"
        :disabled="disabled"
        data-test="channel-edit"
        @click.stop="emit('edit')"
      >
        {{ t('common.edit') }}
      </AppButton>
      <AppButton
        size="sm"
        variant="danger"
        :disabled="disabled"
        data-test="channel-delete"
        @click.stop="emit('delete')"
      >
        {{ t('common.delete') }}
      </AppButton>
    </div>
  </div>
</template>
