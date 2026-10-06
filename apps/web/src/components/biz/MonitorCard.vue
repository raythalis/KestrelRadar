<!-- MonitorCard：监听卡（业务组件层 · v2）。
     正面回答一件事：这条监听「留下什么」——关键词是一排标签，意图描述是一句话；没填就写清楚「全部通过」。
     交互：整卡点＝编辑；状态块只说一次（启用/停用），开关收进 ⋯ 菜单；翻面只由卡脚那个三竖线按钮触发。
     背面放正面没说的真实配置：排除词、是否追全局排除词、这条监听覆盖了哪些动作。
     只出事件，不碰 store：数据与写操作都由页面负责。 -->
<script setup lang="ts">
import type { CardStat } from '@kestrel/contracts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { cardStatView } from '@/components/biz/card-stat'
import { SEMANTIC_ICONS } from '@/components/biz/icons'
import LlmPlusTag from '@/components/biz/LlmPlusTag.vue'

const props = withDefaults(
  defineProps<{
    name: string
    /** 判定模式文案（跟随全局 / 自带算法）；LLM+ 那档只给空串，名字与图标由 llmPlus 渲染 */
    modeLabel: string
    /** 这一条实际生效的模式是 LLM+（跟随全局时看全局那一档） */
    llmPlus?: boolean
    /** 图标（mdi-xxx），按判定模式给 */
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
    /* ---- 背面：后端按对象 + 最近 N 天算好的汇总（与仪表盘同窗口） ---- */
    /** 成功率 / 筛选率 / 计数 / 每天的柱 */
    stat?: CardStat | null
    /** 窗口天数，文案里写「最近 N 天」 */
    windowDays?: number
    /** 鼠标正停在相关卡片上时，这张也跟着亮 */
    linked?: boolean
  }>(),
  {
    icon: 'mdi-magnify',
    keywords: () => [],
    matchLabel: '',
    llmPlus: false,
    intentText: '',
    stat: null,
    windowDays: 7,
  },
)

const emit = defineEmits<{
  edit: []
  toggle: [enabled: boolean]
  delete: []
  /** 鼠标进 / 出这张卡（页面用它把相关的卡片一起标出来） */
  hover: [on: boolean]
}>()

const { t } = useI18n()
const flipped = ref(false)
const menuOpen = ref(false)

/** 背面三件套：成功率、迷你柱、窗口内计数 */
const stat = computed(() => props.stat ?? null)
const days = computed(() => props.windowDays)
const { hasRate, rateText, barHeights, total } = cardStatView(stat, days)

/** 关键词按卡片宽度自适应：先全摆上，放不下就一张张收，收掉的合成 +N */
const rowRef = ref<HTMLElement | null>(null)
const visibleCount = ref(props.keywords.length)
const visibleKeywords = computed(() => props.keywords.slice(0, visibleCount.value))
const restKeywordCount = computed(() => Math.max(0, props.keywords.length - visibleCount.value))

/** 行宽量出来之前，标签宽度不设上限 */
const tailMax = ref('100%')

/** 量行宽：溢出了就少放一张，直到放得下（jsdom 里量不出宽，就保持全显示） */
async function fitKeywords(): Promise<void> {
  const row = rowRef.value
  if (!row) return
  tailMax.value = '100%'
  visibleCount.value = props.keywords.length
  await nextTick()
  // 至少留一个
  while (visibleCount.value > 1 && row.scrollWidth > row.clientWidth) {
    visibleCount.value -= 1
    await nextTick()
  }
  // 只剩一张还放不下：把这一张压进剩下的空间（省略号），别顶出卡片
  if (row.scrollWidth > row.clientWidth) {
    const chip = row.querySelector<HTMLElement>('.k2-chip--tag:not(.k2-card__tagmore)')
    if (chip) {
      const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0
      const used = [...row.children]
        .filter((element) => element !== chip)
        .reduce((sum, element) => sum + element.getBoundingClientRect().width, 0)
      const room = row.clientWidth - used - gap * Math.max(0, row.children.length - 1)
      if (room > 0 && room < chip.scrollWidth) tailMax.value = `${Math.floor(room)}px`
    }
  }
}

let widthWatcher: ResizeObserver | null = null
let lastRowWidth = 0

onMounted(() => {
  void fitKeywords()
  if (typeof ResizeObserver === 'undefined' || !rowRef.value) return
  widthWatcher = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0
    // 只跟着「行宽变化」重算，免得自己收缩又触发自己
    if (Math.abs(width - lastRowWidth) < 1) return
    lastRowWidth = width
    void fitKeywords()
  })
  widthWatcher.observe(rowRef.value)
})

onBeforeUnmount(() => widthWatcher?.disconnect())

watch(
  () => props.keywords,
  () => void fitKeywords(),
)
const stateLabel = computed(() => (props.enabled ? t('common.enabled') : t('common.disabled')))
</script>

<template>
  <article
    class="k2-flip"
    :class="{ 'k2-flip--back': flipped, 'is-linked': linked }"
    data-test="monitor-card"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
  >
    <div class="k2-flip__inner">
      <!-- 正面 -->
      <div
        class="k2-card k2-card--interactive k2-flip__face k2-flip__face--front k2-t-primary"
        role="button"
        tabindex="0"
        @click="emit('edit')"
        @keydown.enter.prevent="emit('edit')"
      >
        <div class="k2-card__head">
          <span class="k2-tile" data-test="monitor-icon">
            <v-icon size="20">{{ icon }}</v-icon>
          </span>
          <span class="k2-card__heading">
            <span class="k2-card__title" data-test="monitor-name">{{ name }}</span>
            <span class="k2-card__sub" data-test="monitor-mode">
              <span v-if="modeLabel">{{ modeLabel }}</span>
              <LlmPlusTag v-if="llmPlus" />
            </span>
          </span>
          <v-menu v-model="menuOpen" :close-on-content-click="true" content-class="k2-menu">
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="k2-iconbtn"
                :aria-label="t('config.more')"
                data-test="monitor-menu"
                @click.stop
              >
                <v-icon size="18">mdi-dots-horizontal</v-icon>
              </button>
            </template>
            <button
              type="button"
              class="k2-menu__item"
              data-test="monitor-edit"
              @click="emit('edit')"
            >
              <v-icon size="18">mdi-pencil-outline</v-icon>{{ t('common.edit') }}
            </button>
            <button
              type="button"
              class="k2-menu__item"
              data-test="monitor-toggle"
              @click="emit('toggle', !enabled)"
            >
              <v-icon size="18">{{ enabled ? 'mdi-pause' : 'mdi-play' }}</v-icon
              >{{ enabled ? t('common.disable') : t('common.enable') }}
            </button>
            <button
              type="button"
              class="k2-menu__item k2-menu__item--danger"
              data-test="monitor-delete"
              @click="emit('delete')"
            >
              <v-icon size="18">mdi-trash-can-outline</v-icon>{{ t('common.delete') }}
            </button>
          </v-menu>
        </div>

        <span
          v-if="keywords.length"
          ref="rowRef"
          class="k2-card__tags"
          :style="{ '--k2-tag-max': tailMax }"
          data-test="monitor-keywords"
        >
          <span v-if="matchLabel" class="k2-card__taglabel" data-test="monitor-match">
            {{ matchLabel }}
          </span>
          <span class="k2-chip k2-chip--tag" v-for="keyword in visibleKeywords" :key="keyword">
            {{ keyword }}
          </span>
          <span
            v-if="restKeywordCount"
            class="k2-chip k2-chip--tag k2-card__tagmore"
            data-test="monitor-tagmore"
          >
            {{ `+${restKeywordCount}` }}
          </span>
        </span>
        <span v-else class="k2-card__detail" data-test="monitor-keywords-empty">
          {{ t('monitor.noKeywords') }}
        </span>
        <span v-if="intentText" class="k2-card__detail" data-test="monitor-intent">
          {{ intentText }}
        </span>

        <div class="k2-card__foot" data-test="monitor-foot">
          <span
            class="k2-chip"
            :class="enabled ? 'k2-t-success' : 'k2-t-neutral'"
            data-test="monitor-status"
          >
            <span class="k2-chip__dot" />{{ stateLabel }}
          </span>
          <span class="k2-card__meta" data-test="monitor-sensitivity">{{ sensitivityLabel }}</span>
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

      <!-- 背面：与 /style-lab 的卡片样例同一个形状（筛选率 + 最近 7 天命中条数） -->
      <div class="k2-card k2-card--flat k2-flip__face k2-flip__face--back k2-t-primary">
        <div class="k2-metric">
          <span class="k2-metric__label">{{ t('config.back.filterRate') }}</span>
          <div class="k2-metric__line">
            <span class="k2-num k2-num--sm" data-test="monitor-back-rate">
              {{ rateText }}<span v-if="hasRate" class="k2-unit">%</span>
            </span>
            <span class="k2-bars" data-test="monitor-back-bars">
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
          <span class="k2-card__meta" data-test="monitor-back-total">
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
