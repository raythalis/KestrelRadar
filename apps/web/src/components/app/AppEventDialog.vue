<!-- AppEventDialog：「查看全部事件」的弹窗。结构照参考稿：
     头部（图标 + 标题 + 计数 + 口径说明 + 关闭）→ 工具条（当前来源 / 清除筛选）
     → 事件列表（复用 EventRow，可滚）→ 底部（已展示 N 条）。
     列表不做传统分页按钮：滚到底就抛 load-more，页面用 cursor 取下一页再补进 events；
     hasMore 为假时列表尾部给一句收尾文案。行本身是 EventRow：点一行抛 open，
     由页面决定记已读、同步外部列表。copy 全走 props，组件不写死文案。 -->
<script setup lang="ts">
import type { EventSourceRef, RecentEvent } from '@kestrel/contracts'
import { nextTick, onMounted, ref, watch } from 'vue'

import EventRow from '@/components/biz/EventRow.vue'

const props = withDefaults(
  defineProps<{
    events: RecentEvent[]
    /** 还有没有下一页（页面按 cursor 的返回传进来） */
    hasMore?: boolean
    /** 正在取下一页 */
    loadingMore?: boolean
    title?: string
    note?: string
    /** 工具条上显示的当前来源（例：全部来源 / 少数派） */
    filterLabel?: string
    allLabel?: string
    clearLabel?: string
    loadingLabel?: string
    endLabel?: string
    /** 关闭按钮的无障碍名 */
    closeLabel?: string
    /** 工具条上「当前来源：」这一小段前缀 */
    filterPrefix?: string
    /** 这一条来源下没有事件时说的那句 */
    emptyLabel?: string
    /** 还能往下滚时给的一句提示 */
    scrollHintLabel?: string
    /** 底部「已展示 N 条事件」：条数由组件给，文案由页面给 */
    statOf?: (count: number) => string
    /** 行的相对时间文案 */
    timeOf?: (event: RecentEvent) => string
    /** 这一件事的其余来源（按需取回来的那份），透传给行上的 +N 浮层 */
    restOf?: (event: RecentEvent) => EventSourceRef[] | undefined
  }>(),
  {
    hasMore: false,
    loadingMore: false,
    // app/* 不写文案：默认一律留空，由页面把 t() 过的值传进来
    title: '',
    note: '',
    filterLabel: '',
    allLabel: '',
    clearLabel: '',
    loadingLabel: '',
    endLabel: '',
  },
)
const emit = defineEmits<{
  open: [event: RecentEvent]
  'clear-filter': []
  'load-more': []
}>()

const open = defineModel<boolean>({ default: false })
const listEl = ref<HTMLElement | null>(null)

/** 离底还有一小段就预取下一页（页面自己去重、自己去防抖） */
const BOTTOM_GAP = 32

function maybeLoadMore(): void {
  const el = listEl.value
  if (!el || !props.hasMore || props.loadingMore) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_GAP) emit('load-more')
}

/** 第一页没占满的话，打开就该继续填——不然滚不动、也就没机会触发 */
function fillFirstScreen(): void {
  const el = listEl.value
  if (!el || !props.hasMore || props.loadingMore) return
  if (el.scrollHeight <= el.clientHeight) emit('load-more')
}

onMounted(() => {
  void nextTick(fillFirstScreen)
})
watch(
  () => [props.events.length, props.hasMore, props.loadingMore, open.value],
  () => {
    void nextTick(fillFirstScreen)
  },
)
</script>

<template>
  <v-dialog v-model="open" :max-width="760" content-class="k2-sheet">
    <div class="k2-modal" data-test="app-event-dialog">
      <div class="k2-modal__head">
        <span class="k2-modal__icon">
          <v-icon size="18">mdi-broadcast</v-icon>
        </span>
        <span class="k2-card__heading">
          <span class="k2-modal__title-line">
            <span class="k2-modal__title">{{ title }}</span>
            <span class="k2-modal__count">{{ events.length }}</span>
          </span>
          <span class="k2-card__sub">{{ note }}</span>
        </span>
        <button
          type="button"
          class="k2-modal__close"
          :aria-label="closeLabel"
          data-test="app-event-dialog-close"
          @click="open = false"
        >
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>

      <div class="k2-modal__bar">
        <span class="k2-modal__filter">
          <v-icon size="14">mdi-filter-variant</v-icon>
          {{ filterPrefix }}<strong>{{ filterLabel }}</strong>
        </span>
        <button
          v-if="filterLabel !== allLabel"
          type="button"
          class="k2-modal__clear"
          data-test="app-event-dialog-clear"
          @click="emit('clear-filter')"
        >
          {{ clearLabel }}
        </button>
      </div>

      <div
        ref="listEl"
        class="k2-modal__list"
        data-test="app-event-dialog-list"
        @scroll.passive="maybeLoadMore"
      >
        <EventRow
          v-for="event in events"
          :key="event.id"
          :event="event"
          :time="timeOf?.(event)"
          :rest-sources="restOf?.(event)"
          @open="emit('open', $event)"
        />
        <div v-if="events.length === 0" class="k2-modal__empty">{{ emptyLabel }}</div>
        <div
          v-else-if="hasMore || loadingMore"
          class="k2-modal__more"
          data-test="app-event-dialog-loading"
        >
          <span v-if="loadingMore" class="k2-spin" aria-hidden="true" />
          <span>{{ loadingMore ? loadingLabel : scrollHintLabel }}</span>
        </div>
        <div v-else class="k2-modal__more k2-modal__more--end" data-test="app-event-dialog-end">
          {{ endLabel }}
        </div>
      </div>

      <div class="k2-modal__foot">
        <span class="k2-modal__stat">{{ statOf?.(events.length) }}</span>
      </div>
    </div>
  </v-dialog>
</template>
