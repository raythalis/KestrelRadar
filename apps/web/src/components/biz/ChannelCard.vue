<!-- ChannelCard：通知渠道卡片（业务组件层）。
     状态只由左侧色条表达；右下角的圆点是测试连通性的按钮（悬停出提示，测试中转圈）。
     点击整张卡片＝编辑；右上角 ×＝删除；启用开关在编辑表单里，不占卡片位置。
     类型文案与图标都由渠道类型枚举决定，页面不手写。
     只出事件，不碰 store：数据与写操作由页面负责。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChannelType } from '@kestrel/contracts'

const props = withDefaults(
  defineProps<{
    name: string
    /** 渠道类型（枚举值）：第二行文案与图标都跟着它走 */
    type: ChannelType
    enabled: boolean
    /** 连通状态：颜色只用在左侧色条与测试圆点上 */
    tone?: 'ok' | 'warn' | 'err' | 'neutral'
    /** 状态文案：只作为圆点的悬停提示与无障碍标签，不显示成文字 */
    statusText: string
    /** 被几个动作引用；0 表示还没人用 */
    usedBy?: number
    /** 正在测试连通性 */
    busy?: boolean
  }>(),
  { tone: 'neutral', usedBy: 0, busy: false },
)

const emit = defineEmits<{ edit: []; test: []; delete: [] }>()

const { t } = useI18n()

/** 图标跟类型枚举走 */
const ICONS: Record<ChannelType, string> = {
  telegram: 'mdi-telegram',
  webhook: 'mdi-webhook',
}

const icon = computed(() => ICONS[props.type])
const kindLabel = computed(() => t(`channel.type.${props.type}`))

/** 悬停提示：状态 + 这个圆点是干什么的；测试中说明正在发 */
const probeTitle = computed(() =>
  props.busy ? t('channel.probeRunning') : `${props.statusText} · ${t('channel.probe')}`,
)
</script>

<template>
  <div
    class="biz-card"
    :class="[`biz-card--${tone}`, { 'is-off': !enabled }]"
    role="button"
    tabindex="0"
    data-test="channel-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
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
      <button
        type="button"
        class="biz-card__remove"
        data-test="channel-delete"
        :title="t('common.delete')"
        :aria-label="t('common.delete')"
        @click.stop="emit('delete')"
      >
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <div class="biz-card__foot">
      <span class="biz-card__meta" data-test="channel-used-by">
        {{ t('channel.usedBy', { n: usedBy }) }}
      </span>
      <span class="app-spacer" />
      <button
        type="button"
        class="biz-card__probe"
        :class="{
          'biz-card__probe--busy': busy,
          'biz-card__probe--attention': !busy && (tone === 'err' || tone === 'warn'),
        }"
        data-test="channel-test"
        :title="probeTitle"
        :aria-label="probeTitle"
        :aria-busy="busy"
        @click.stop="emit('test')"
      />
    </div>
  </div>
</template>
