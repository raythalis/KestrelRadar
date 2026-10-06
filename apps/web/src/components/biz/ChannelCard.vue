<!-- ChannelCard：通知渠道卡片（v2）。
     外观与 style-lab 的通知渠道样例保持一致：方形图标块 + 名称/类型 + 分隔线，
     卡脚左边是最近推送时间（没推过写「从未推送过」），右边是测试与删除。
     测试按钮的类里带着自己的状态（未测／测试中／连通／有警告／失败），颜色由类决定；
     停用的渠道整张变淡、不给测试按钮。整张卡点击＝编辑。只出事件，不碰 store。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChannelType } from '@kestrel/contracts'

import { CHANNEL_ICONS } from './icons'

const props = withDefaults(
  defineProps<{
    name: string
    /** 渠道类型（枚举值）：第二行文案与图标都跟着它走 */
    type: ChannelType
    enabled: boolean
    /** 最近一次推送时间（ISO 串）；null＝确实从未推送过，undefined＝还没这个数据、不显示 */
    lastPushedAt?: string | null
    /** 渠道状态：只决定左侧色条颜色 */
    tone?: 'ok' | 'warn' | 'err' | 'neutral'
    /** 测试圆点自己的状态：未测 / 测试中 / 连通 / 有警告 / 失败 */
    probe?: 'idle' | 'testing' | 'ok' | 'warn' | 'fail'
  }>(),
  { target: '', lastPushedAt: null, tone: 'neutral', probe: 'idle' },
)

const emit = defineEmits<{ edit: []; test: []; delete: [] }>()

const { t } = useI18n()

const icon = computed(() => CHANNEL_ICONS[props.type])
const kindLabel = computed(() => t(`channel.type.${props.type}`))
/** tone 到 v2 色调类的映射（只有这四个，页面不传别的） */
const toneClass = computed(
  () =>
    ({ ok: 'k2-t-success', warn: 'k2-t-warning', err: 'k2-t-danger', neutral: 'k2-t-neutral' })[
      props.tone
    ],
)
/** 测试中不能再点 */
const testing = computed(() => props.probe === 'testing')

/** 左下角：最近推送的语义化时间；null＝从未推送过，undefined＝没这个数据、整行不画 */
const lastPushText = computed(() => {
  if (props.lastPushedAt === undefined) return ''
  if (props.lastPushedAt === null) return t('channel.neverPushed')
  const minutes = Math.floor((Date.now() - new Date(props.lastPushedAt).getTime()) / 60000)
  if (minutes < 1) return t('channel.pushedJustNow')
  if (minutes < 60) return t('channel.pushedMinutes', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('channel.pushedHours', { n: hours })
  return t('channel.pushedDays', { n: Math.floor(hours / 24) })
})
</script>

<template>
  <article
    class="k2-card k2-card--sm k2-card--interactive k2-chan"
    :class="[toneClass, { 'is-off': !enabled }]"
    role="button"
    tabindex="0"
    data-test="channel-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
  >
    <div class="k2-card__head">
      <span class="k2-tile k2-tile--sm" data-test="channel-icon">
        <i class="mdi" :class="icon" />
      </span>
      <span class="k2-card__heading">
        <span class="k2-row__title" data-test="channel-name">{{ name }}</span>
        <span class="k2-row__sub" data-test="channel-kind">{{ kindLabel }}</span>
      </span>
    </div>

    <hr class="k2-card__sep" />

    <div class="k2-card__foot">
      <span v-if="lastPushText" class="k2-card__meta" data-test="channel-last-push">
        {{ lastPushText }}
      </span>
      <button
        v-if="enabled"
        type="button"
        class="k2-btn k2-btn--ghost k2-btn--sm k2-chan__test"
        :class="`k2-chan__probe--${probe}`"
        data-test="channel-test"
        :title="testing ? t('channel.probeRunning') : t('channel.probe')"
        :aria-label="t('channel.probe')"
        :aria-busy="testing || undefined"
        :disabled="testing"
        @click.stop="emit('test')"
      >
        <span v-if="testing" class="k2-spin" />
        <i v-else class="mdi mdi-play" />{{ t('channel.test') }}
      </button>
      <button
        type="button"
        class="k2-iconbtn k2-iconbtn--danger"
        data-test="channel-delete"
        :title="t('channel.delete')"
        :aria-label="t('channel.delete')"
        @click.stop="emit('delete')"
      >
        <i class="mdi mdi-trash-can-outline" />
      </button>
    </div>
  </article>
</template>
