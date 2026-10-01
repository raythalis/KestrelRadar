<!-- SourceCard：数据源（发现来源）卡片（业务组件层）。
     结构跟 ChannelCard 对齐：右上角 ×＝删除（二级确认由页面做）、点整张卡片＝编辑、不再摆底部按钮行。
     状态块（颜色 + 短标签）本身就是「抓取测试」的入口：点它试抓，抓取中转圈且不给再点；
     还没有结果时它就显示「抓取测试」。停用的源不给抓。
     没有左侧色条：状态只由状态块的颜色表达（ChannelCard 才用左侧色条）。
     卡上不写实例地址、已收条数、解释性提示——要么在编辑里，要么由状态自己说。
     只出事件，不碰 store：数据、试抓结果与写操作都由页面负责。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import { formatShortDateTime } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    name: string
    /** 来源类型文案（RSSHub 路由 / RSS 源 / 网页） */
    kindLabel: string
    /** 来源图标（mdi-xxx） */
    icon?: string
    enabled: boolean
    /** 抓取目标：路由路径或网址 */
    target: string
    /** 采集周期：原样展示 cron 表达式，不做人话翻译 */
    cron: string
    /** 下次采集时间；停用的源没有下次 */
    nextRunAt?: string | null
    tone?: 'ok' | 'warn' | 'err' | 'neutral'
    /** 状态短标签；还没抓过时页面传「抓取测试」 */
    statusText: string
    /** 抓取中 */
    busy?: boolean
  }>(),
  { icon: 'mdi-rss', tone: 'neutral', nextRunAt: null, busy: false },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  test: []
  delete: []
}>()

const { t } = useI18n()

/** 抓取中或已停用都不给再抓 */
const probeDisabled = computed(() => props.busy || !props.enabled)
</script>

<template>
  <div
    class="biz-card biz-card--no-bar"
    :class="[`biz-card--${tone}`, { 'is-off': !enabled }]"
    role="button"
    tabindex="0"
    data-test="source-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
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
      <button
        type="button"
        class="biz-card__remove"
        data-test="source-delete"
        :title="t('common.delete')"
        :aria-label="t('common.delete')"
        @click.stop="emit('delete')"
      >
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <div class="biz-card__body">
      <button
        type="button"
        class="biz-card__chipbtn"
        data-test="source-test"
        :title="t('discovery.test')"
        :aria-label="t('discovery.test')"
        :aria-busy="busy || undefined"
        :disabled="probeDisabled"
        @click.stop="emit('test')"
      >
        <AppStatus :tone="tone" :busy="busy" data-test="source-status">{{ statusText }}</AppStatus>
      </button>
      <span class="biz-card__sub biz-card__sub--mono" data-test="source-target">{{ target }}</span>
    </div>

    <div class="biz-card__foot" data-test="source-foot">
      <span class="biz-card__meta biz-card__meta--mono" data-test="source-cron">{{ cron }}</span>
      <span v-if="enabled && nextRunAt" class="biz-card__meta" data-test="source-next-run">
        {{ t('discovery.nextRun') }}{{ formatShortDateTime(nextRunAt) }}
      </span>
      <span class="app-spacer" />
      <span @click.stop>
        <AppSwitch
          :model-value="enabled"
          :aria-label="enabled ? t('common.enabled') : t('common.disabled')"
          data-test="source-enabled"
          @update:model-value="(value: boolean) => emit('toggle', value)"
        />
      </span>
    </div>
  </div>
</template>
