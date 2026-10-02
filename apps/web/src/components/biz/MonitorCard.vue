<!-- MonitorCard：监听卡片（业务组件层）。
     结构跟数据源卡/动作卡对齐：右上角 ×＝删除（二级确认由页面做）、点整张卡片＝编辑、不摆底部按钮行、不要左侧色条。
     卡上回答一件事：这条监听「留下什么」——关键词是一排标签，意图描述是一句话；没填关键词就写清楚「全部通过」。
     灵敏度这类附属信息放卡脚（方角 AppStatus，不写字段名），开关也在卡脚右下。
     只出事件，不碰 store：数据、写操作与删除确认都由页面负责。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'

const props = withDefaults(
  defineProps<{
    name: string
    /** 判定模式文案（跟随全局 / 自带算法 / 算法 + LLM） */
    modeLabel: string
    /** 图标（mdi-xxx） */
    icon?: string
    /** 命中关键词；空数组＝全部通过 */
    keywords?: string[]
    /** 关键词的匹配方式文案（任意命中 / 全部命中）；没关键词时不显示 */
    matchLabel?: string
    /** 意图描述，只有「算法 + LLM」模式才有 */
    intentText?: string
    /** 灵敏度文案（宽松 / 标准 / 严格） */
    sensitivityLabel: string
    enabled: boolean
  }>(),
  {
    icon: 'mdi-magnify',
    keywords: () => [],
    matchLabel: '',
    intentText: '',
  },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  delete: []
}>()

const { t } = useI18n()

/** 关键词最多摊三个，剩下的给个 +N——卡上不是看全文的地方 */
const VISIBLE_KEYWORDS = 3
const visibleKeywords = computed(() => props.keywords.slice(0, VISIBLE_KEYWORDS))
const restKeywordCount = computed(() => Math.max(0, props.keywords.length - VISIBLE_KEYWORDS))
</script>

<template>
  <div
    class="biz-card biz-card--no-bar"
    :class="{ 'is-off': !enabled }"
    role="button"
    tabindex="0"
    data-test="monitor-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
  >
    <div class="biz-card__head">
      <span class="biz-card__icon" data-test="monitor-icon">
        <v-icon size="18">{{ icon }}</v-icon>
      </span>
      <span class="biz-card__heading">
        <span class="biz-card__title" data-test="monitor-name">{{ name }}</span>
        <span class="biz-card__kind" data-test="monitor-mode">{{ modeLabel }}</span>
      </span>
      <span class="app-spacer" />
      <button
        type="button"
        class="biz-card__remove"
        data-test="monitor-delete"
        :title="t('common.delete')"
        :aria-label="t('common.delete')"
        @click.stop="emit('delete')"
      >
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <div class="biz-card__body">
      <span v-if="keywords.length" class="biz-card__line" data-test="monitor-keywords">
        <AppTag v-for="keyword in visibleKeywords" :key="keyword">{{ keyword }}</AppTag>
        <AppTag v-if="restKeywordCount">{{ `+${restKeywordCount}` }}</AppTag>
        <span v-if="matchLabel" class="biz-card__meta" data-test="monitor-match">{{
          matchLabel
        }}</span>
      </span>
      <span v-else class="biz-card__sub" data-test="monitor-keywords-empty">
        {{ t('monitor.noKeywords') }}
      </span>

      <span v-if="intentText" class="biz-card__sub" data-test="monitor-intent">{{
        intentText
      }}</span>
    </div>

    <div class="biz-card__foot" data-test="monitor-foot">
      <AppStatus square :dot="false" data-test="monitor-sensitivity">{{
        sensitivityLabel
      }}</AppStatus>
      <span class="app-spacer" />
      <span @click.stop>
        <AppSwitch
          :model-value="enabled"
          :aria-label="enabled ? t('common.enabled') : t('common.disabled')"
          data-test="monitor-enabled"
          @update:model-value="(value: boolean) => emit('toggle', value)"
        />
      </span>
    </div>
  </div>
</template>
