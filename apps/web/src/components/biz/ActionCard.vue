<!-- ActionCard：动作卡（业务组件层 · v2）。
     正面回答：这条动作把什么发到哪儿——渠道实例名 + 触发方式 + 消息模板。
     交互：整卡点＝编辑；状态块只说一次（启用/停用），开关收进 ⋯ 菜单；翻面只由卡脚那个三竖线按钮触发。
     没选渠道时就在渠道那一行说「未选择渠道」，不再另开提示框。
     背面放正面没说到的发送细节：消息模板与「合并为一条 / 含已推内容」两个开关的现状；
     投递成功率与最近七天条数等后端有落库统计再上。
     只出事件，不碰 store：数据与写操作都由页面负责。 -->
<script setup lang="ts">
import { humanizeCron, type CardStat } from '@kestrel/contracts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { cardStatView } from '@/components/biz/card-stat'
import { SEMANTIC_ICONS } from '@/components/biz/icons'
import { cronText } from '@/utils/cron'

const props = withDefaults(
  defineProps<{
    name: string
    /** 触发方式文案（发现即发 / 每天汇总） */
    triggerLabel: string
    /** 图标（mdi-xxx），按绑定渠道的类型给 */
    icon?: string
    /** 定时汇总的 cron 表达式；实时推送没有 */
    cron?: string | null
    /** 目标渠道名；缺了就是没配 */
    channelName?: string
    /** 消息模板名 */
    templateName?: string
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
    icon: 'mdi-bell-ring-outline',
    cron: null,
    channelName: '',
    templateName: '',
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

/** 没选渠道：这是这条动作真正的问题，只在这一行说，不再另开提示框 */
const channelMissing = computed(() => !props.channelName)
const stateLabel = computed(() => (props.enabled ? t('common.enabled') : t('common.disabled')))
/** 汇总时间：认得出写人话，认不出写裸表达式 */
const plan = computed(() => (props.cron ? humanizeCron(props.cron) : null))
/** 认得出写人话；认不出退回裸表达式（这一处只做展示，不改值） */
const planText = computed(() => (plan.value ? cronText(plan.value) : props.cron))
</script>

<template>
  <article
    class="k2-flip"
    :class="{ 'k2-flip--back': flipped, 'is-linked': linked }"
    data-test="action-card"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
  >
    <div class="k2-flip__inner">
      <!-- 正面 -->
      <div
        class="k2-card k2-card--interactive k2-flip__face k2-flip__face--front k2-t-success"
        role="button"
        tabindex="0"
        @click="emit('edit')"
        @keydown.enter.prevent="emit('edit')"
      >
        <div class="k2-card__head">
          <span class="k2-tile" data-test="action-icon">
            <v-icon size="20">{{ icon }}</v-icon>
          </span>
          <span class="k2-card__heading">
            <span class="k2-card__title" data-test="action-name">{{ name }}</span>
            <span class="k2-card__sub" data-test="action-trigger">{{ triggerLabel }}</span>
          </span>
          <v-menu v-model="menuOpen" :close-on-content-click="true" content-class="k2-menu">
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="k2-iconbtn"
                :aria-label="t('config.more')"
                data-test="action-menu"
                @click.stop
              >
                <v-icon size="18">mdi-dots-horizontal</v-icon>
              </button>
            </template>
            <button
              type="button"
              class="k2-menu__item"
              data-test="action-edit"
              @click="emit('edit')"
            >
              <v-icon size="18">mdi-pencil-outline</v-icon>{{ t('common.edit') }}
            </button>
            <button
              type="button"
              class="k2-menu__item"
              data-test="action-toggle"
              @click="emit('toggle', !enabled)"
            >
              <v-icon size="18">{{ enabled ? 'mdi-pause' : 'mdi-play' }}</v-icon
              >{{ enabled ? t('common.disable') : t('common.enable') }}
            </button>
            <button
              type="button"
              class="k2-menu__item k2-menu__item--danger"
              data-test="action-delete"
              @click="emit('delete')"
            >
              <v-icon size="18">mdi-trash-can-outline</v-icon>{{ t('common.delete') }}
            </button>
          </v-menu>
        </div>

        <span class="k2-card__row" data-test="action-channel-row">
          <span
            class="k2-card__detail"
            :class="{ 'k2-card__detail--warn': channelMissing }"
            data-test="action-channel"
          >
            {{ channelName || t('action.channelMissing') }}
          </span>
        </span>
        <span v-if="templateName" class="k2-card__detail" data-test="action-template">
          {{ templateName }}
        </span>

        <div class="k2-card__foot" data-test="action-foot">
          <span
            class="k2-chip"
            :class="enabled ? 'k2-t-success' : 'k2-t-neutral'"
            data-test="action-status"
          >
            <span class="k2-chip__dot" />{{ stateLabel }}
          </span>
          <span v-if="cron" class="k2-card__meta" data-test="action-cron">{{ planText }}</span>
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

      <!-- 背面：与 /style-lab 的卡片样例同一个形状（投递成功率 + 最近 7 天投递次数） -->
      <div class="k2-card k2-card--flat k2-flip__face k2-flip__face--back k2-t-success">
        <div class="k2-metric">
          <span class="k2-metric__label">{{ t('config.back.deliveryRate') }}</span>
          <div class="k2-metric__line">
            <span class="k2-num k2-num--sm" data-test="action-back-rate">
              {{ rateText }}<span v-if="hasRate" class="k2-unit">%</span>
            </span>
            <span class="k2-bars" data-test="action-back-bars">
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
          <span class="k2-card__meta" data-test="action-back-total">
            {{ t('config.back.windowTimes', { days, n: total }) }}
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
