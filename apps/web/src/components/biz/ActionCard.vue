<!-- ActionCard：投递动作卡片（业务组件层）。
     结构跟数据源卡对齐：右上角 ×＝删除（二级确认由页面做）、点整张卡片＝编辑、不摆底部按钮行、不要左侧色条。
     状态由内容自己说：没选渠道时渠道那一行写「未选择渠道」并用警示色，不再单独摆提示框。
     定时汇总的 cron 表达式与下次汇总时间放在卡脚（跟数据源卡同一个位置），开关也在卡脚右下。
     只出事件，不碰 store：数据、写操作与删除确认都由页面负责。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppSwitch from '@/components/app/AppSwitch.vue'
import { formatShortDateTime } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    name: string
    /** 触发方式文案（实时推送 / 定时汇总） */
    triggerLabel: string
    /** 图标（mdi-xxx），默认按触发方式给 */
    icon?: string
    /** 定时汇总的 cron 表达式；实时推送没有 */
    cron?: string | null
    /** 定时汇总的下次汇总时间 */
    nextRunAt?: string | null
    /** 目标渠道名；缺了就是没配 */
    channelName?: string
    /** 消息模板名 */
    templateName?: string
    enabled: boolean
  }>(),
  { icon: 'mdi-bell-ring-outline', cron: null, nextRunAt: null },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  delete: []
}>()

const { t } = useI18n()

/** 没选渠道：这是这条动作真正的问题，只在这一行说，不再另开提示框 */
const channelMissing = computed(() => !props.channelName)
</script>

<template>
  <div
    class="biz-card biz-card--no-bar"
    :class="{ 'is-off': !enabled }"
    role="button"
    tabindex="0"
    data-test="action-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
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
      <button
        type="button"
        class="biz-card__remove"
        data-test="action-delete"
        :title="t('common.delete')"
        :aria-label="t('common.delete')"
        @click.stop="emit('delete')"
      >
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <div class="biz-card__body">
      <span
        class="biz-card__sub"
        :class="{ 'biz-card__sub--warn': channelMissing }"
        data-test="action-channel"
      >
        {{ channelName || t('action.channelMissing') }}
      </span>
      <span v-if="templateName" class="biz-card__meta" data-test="action-template">
        {{ templateName }}
      </span>
    </div>

    <div class="biz-card__foot" data-test="action-foot">
      <span v-if="cron" class="biz-card__meta biz-card__meta--mono" data-test="action-cron">
        {{ cron }}
      </span>
      <span v-if="enabled && cron && nextRunAt" class="biz-card__meta" data-test="action-next-run">
        {{ t('action.nextRun') }}{{ formatShortDateTime(nextRunAt) }}
      </span>
      <span class="app-spacer" />
      <span @click.stop>
        <AppSwitch
          :model-value="enabled"
          :aria-label="enabled ? t('common.enabled') : t('common.disabled')"
          data-test="action-enabled"
          @update:model-value="(value: boolean) => emit('toggle', value)"
        />
      </span>
    </div>
  </div>
</template>
