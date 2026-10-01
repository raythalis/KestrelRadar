<!-- SourceCard：数据源（发现来源）卡片（业务组件层）。
     状态：未试过 / 有内容(ok) / 通但空(warn) / 不通(err) / 试抓中(busy) / 停用 / 不可用。
     只出事件，不碰 store。 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    name: string
    /** 来源类型文案（RSSHub 路由 / 网页 / …） */
    kindLabel: string
    /** 来源图标（mdi-xxx） */
    icon?: string
    enabled: boolean
    /** 抓取目标：路由路径或网址 */
    target: string
    /** 实例地址（RSSHub 基址等） */
    instance?: string
    /** 采集频率（已格式化，如"每 30 分钟"） */
    frequency?: string
    tone?: 'ok' | 'warn' | 'err' | 'neutral'
    statusText: string
    /** 失败/警告的说明文字 */
    message?: string
    /** 最近一次抓到的条目数 */
    foundItemCount?: number
    busy?: boolean
    disabled?: boolean
  }>(),
  { icon: 'mdi-rss', tone: 'neutral', busy: false, disabled: false },
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
    data-test="source-card"
    @click="disabled ? undefined : emit('edit')"
    @keydown.enter.prevent="disabled ? undefined : emit('edit')"
  >
    <div class="biz-card__head">
      <span class="biz-card__icon" data-test="source-icon">
        <v-icon size="18">{{ icon }}</v-icon>
      </span>
      <span class="biz-card__heading">
        <span class="biz-card__title" data-test="source-name">{{ name }}</span>
        <span class="biz-card__kind" data-test="source-kind">{{ kindLabel }}</span>
      </span>
      <span class="app-spacer" />
      <span @click.stop>
        <AppSwitch
          :model-value="enabled"
          :disabled="disabled"
          :aria-label="enabled ? t('common.enabled') : t('common.disabled')"
          data-test="source-enabled"
          @update:model-value="(value: boolean) => emit('toggle', value)"
        />
      </span>
    </div>

    <div class="biz-card__body">
      <AppStatus :tone="tone" :busy="busy" data-test="source-status">{{ statusText }}</AppStatus>
      <span class="biz-card__sub biz-card__sub--mono" data-test="source-target">{{ target }}</span>
      <span v-if="instance" class="biz-card__meta" data-test="source-instance">{{ instance }}</span>
      <AppHint
        v-if="message"
        :tone="tone === 'ok' ? 'info' : tone === 'neutral' ? 'info' : tone"
        data-test="source-message"
      >
        {{ message }}
      </AppHint>
    </div>

    <div class="biz-card__foot">
      <span v-if="frequency" class="biz-card__meta" data-test="source-frequency">{{
        frequency
      }}</span>
      <span v-if="foundItemCount !== undefined" class="biz-card__meta" data-test="source-count">
        {{ t('discovery.itemCount', { n: foundItemCount }) }}
      </span>
      <span class="app-spacer" />
      <AppButton
        size="sm"
        variant="ghost"
        :loading="busy"
        :disabled="disabled || !enabled"
        data-test="source-test"
        @click.stop="emit('test')"
      >
        {{ t('discovery.test') }}
      </AppButton>
      <AppButton
        size="sm"
        variant="ghost"
        :disabled="disabled"
        data-test="source-edit"
        @click.stop="emit('edit')"
      >
        {{ t('common.edit') }}
      </AppButton>
      <AppButton
        size="sm"
        variant="danger"
        :disabled="disabled"
        data-test="source-delete"
        @click.stop="emit('delete')"
      >
        {{ t('common.delete') }}
      </AppButton>
    </div>
  </div>
</template>
