<!-- SourceCard：发现卡（业务组件层 · v2）。
     正面回答：去哪儿看、多久看一次、现在什么状态；背面回答：最近一次采集到底成不成。
     交互：整卡点＝编辑；状态块只说一次（启用/停用），开关与「抓取测试」收进 ⋯ 菜单；
     翻面只由卡脚那个三竖线按钮触发，正反面同一高度（高度定在 .k2-flip 上）。
     背面的统计类数值（成功率 / 迷你柱 / 最近七天条数）等后端有落库统计再上，这里只放现有真数据。
     只出事件，不碰 store：数据、试抓与写操作都由页面负责。 -->
<script setup lang="ts">
import { CUSTOM_SCHEDULE_COPY, humanizeCron, type CardStat } from '@kestrel/contracts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { cardStatView } from '@/components/biz/card-stat'
import { SEMANTIC_ICONS } from '@/components/biz/icons'
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
    /** 采集周期：裸 cron 表达式，展示时翻成人话 */
    cron: string
    /** 下次采集时间；停用的源没有下次 */
    nextRunAt?: string | null
    /** 抓取测试正在跑 */
    busy?: boolean
    /* ---- 背面：后端按对象 + 最近 N 天算好的汇总（与仪表盘同窗口） ---- */
    /** 成功率 / 筛选率 / 计数 / 每天的柱 */
    stat?: CardStat | null
    /** 窗口天数，文案里写「最近 N 天」 */
    windowDays?: number
  }>(),
  {
    icon: 'mdi-rss',
    nextRunAt: null,
    busy: false,
    stat: null,
    windowDays: 7,
  },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  test: []
  delete: []
}>()

const { t } = useI18n()
const flipped = ref(false)
const menuOpen = ref(false)

/** 背面三件套：成功率、迷你柱、窗口内计数 */
const stat = computed(() => props.stat ?? null)
const days = computed(() => props.windowDays)
const { hasRate, rateText, barHeights, total } = cardStatView(stat, days)

/** 计划：认得出写人话；认不出写「自定义时间」，原表达式挂 tooltip */
const plan = computed(() => humanizeCron(props.cron))
const planText = computed(() => plan.value ?? CUSTOM_SCHEDULE_COPY)
const stateLabel = computed(() => (props.enabled ? t('common.enabled') : t('common.disabled')))
</script>

<template>
  <article class="k2-flip" :class="{ 'k2-flip--back': flipped }" data-test="source-card">
    <div class="k2-flip__inner">
      <!-- 正面 -->
      <div
        class="k2-card k2-card--interactive k2-flip__face k2-flip__face--front k2-t-info"
        role="button"
        tabindex="0"
        @click="emit('edit')"
        @keydown.enter.prevent="emit('edit')"
      >
        <div class="k2-card__head">
          <span class="k2-tile" data-test="source-icon">
            <v-icon size="20">{{ icon }}</v-icon>
          </span>
          <span class="k2-card__heading">
            <span class="k2-card__title" data-test="source-name">{{ name }}</span>
            <span class="k2-card__sub" data-test="source-kind">{{ kindLabel }}</span>
          </span>
          <v-menu v-model="menuOpen" :close-on-content-click="true" content-class="k2-menu">
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="k2-iconbtn"
                :aria-label="busy ? t('discovery.testRunning') : t('config.more')"
                :aria-busy="busy || undefined"
                :disabled="busy"
                data-test="source-menu"
                @click.stop
              >
                <span v-if="busy" class="k2-spin" data-test="source-testing" />
                <v-icon v-else size="18">mdi-dots-horizontal</v-icon>
              </button>
            </template>
            <button
              type="button"
              class="k2-menu__item"
              data-test="source-edit"
              @click="emit('edit')"
            >
              <v-icon size="18">mdi-pencil-outline</v-icon>{{ t('common.edit') }}
            </button>
            <button
              type="button"
              class="k2-menu__item"
              data-test="source-test"
              :disabled="busy"
              @click="emit('test')"
            >
              <v-icon size="18">{{ SEMANTIC_ICONS.testFetch }}</v-icon
              >{{ t('discovery.test') }}
            </button>
            <button
              type="button"
              class="k2-menu__item"
              data-test="source-toggle"
              @click="emit('toggle', !enabled)"
            >
              <v-icon size="18">{{ enabled ? 'mdi-pause' : 'mdi-play' }}</v-icon
              >{{ enabled ? t('common.disable') : t('common.enable') }}
            </button>
            <button
              type="button"
              class="k2-menu__item k2-menu__item--danger"
              data-test="source-delete"
              @click="emit('delete')"
            >
              <v-icon size="18">mdi-trash-can-outline</v-icon>{{ t('common.delete') }}
            </button>
          </v-menu>
        </div>

        <span class="k2-card__detail k2-card__detail--mono" data-test="source-target">
          {{ target }}
        </span>

        <div class="k2-card__foot" data-test="source-foot">
          <span
            class="k2-chip"
            :class="enabled ? 'k2-t-success' : 'k2-t-neutral'"
            data-test="source-status"
          >
            <span class="k2-chip__dot" />{{ stateLabel }}
          </span>
          <span class="k2-card__when">
            <span
              class="k2-card__when-plan"
              :title="plan ? undefined : cron"
              data-test="source-plan"
            >
              {{ planText }}
            </span>
            <span
              v-if="enabled && nextRunAt"
              class="k2-card__when-next"
              data-test="source-next-run"
            >
              {{ t('discovery.nextRun') }}{{ formatShortDateTime(nextRunAt) }}
            </span>
          </span>
          <button
            type="button"
            class="k2-iconbtn k2-card__flipbtn"
            :aria-label="t('config.flipToBack')"
            data-test="flip-button"
            @click.stop="flipped = true"
          >
            <v-icon size="18" :title="t('config.flipToBack')">{{ SEMANTIC_ICONS.flip }}</v-icon>
          </button>
        </div>
      </div>

      <!-- 背面：与 /style-lab 的卡片样例同一个形状（抓取成功率 + 最近 7 天抓到条数） -->
      <div class="k2-card k2-card--flat k2-flip__face k2-flip__face--back k2-t-info">
        <div class="k2-metric">
          <span class="k2-metric__label">{{ t('config.back.rate') }}</span>
          <div class="k2-metric__line">
            <span class="k2-num k2-num--sm" data-test="source-back-rate">
              {{ rateText }}<span v-if="hasRate" class="k2-unit">%</span>
            </span>
            <span class="k2-bars" data-test="source-back-bars">
              <span
                v-for="(height, index) in barHeights"
                :key="index"
                class="k2-bars__bar"
                :class="{ 'k2-bars__bar--on': index === barHeights.length - 1 }"
                :style="{ blockSize: `${height}px` }"
              />
            </span>
          </div>
        </div>
        <hr class="k2-card__sep" />
        <div class="k2-card__foot">
          <span class="k2-card__meta" data-test="source-back-total">
            {{ t('config.back.windowItems', { days, n: total }) }}
          </span>
          <button
            type="button"
            class="k2-iconbtn k2-card__flipbtn"
            :aria-label="t('config.flipToFront')"
            data-test="flip-back-button"
            @click.stop="flipped = false"
          >
            <v-icon size="18" :title="t('config.flipToFront')">{{ SEMANTIC_ICONS.flip }}</v-icon>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
