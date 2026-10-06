<!-- AppEventDialog：「查看全部事件」的弹窗。结构照参考稿：
     头部（图标 + 标题 + 计数 + 口径说明 + 关闭）→ 工具条（当前来源 / 清除筛选）
     → 事件列表（复用 EventRow，可滚）→ 底部（已展示 N 条 + 完成）。
     行本身还是 EventRow：点一行 = 打开原文 + 抛 open，由页面决定记已读、同步外部列表。
     copy 全走 props，组件不写死文案。 -->
<script setup lang="ts">
import type { EventSourceRef, RecentEvent } from '@kestrel/contracts'

import EventRow from '@/components/biz/EventRow.vue'

withDefaults(
  defineProps<{
    events: RecentEvent[]
    title?: string
    note?: string
    /** 工具条上显示的当前来源（例：全部来源 / 少数派） */
    filterLabel?: string
    allLabel?: string
    clearLabel?: string
    doneLabel?: string
    /** 行的相对时间文案 */
    timeOf?: (event: RecentEvent) => string
    /** 这一件事的其余来源（按需取回来的那份），透传给行上的 +N 浮层 */
    restOf?: (event: RecentEvent) => EventSourceRef[] | undefined
  }>(),
  {
    title: '全部事件',
    note: '最多展示最近 20 条事件',
    filterLabel: '全部来源',
    allLabel: '全部来源',
    clearLabel: '清除筛选',
    doneLabel: '完成',
  },
)
const emit = defineEmits<{
  open: [event: RecentEvent]
  'clear-filter': []
}>()

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <v-dialog v-model="open" :max-width="760" content-class="k2-modal-scrim-free">
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
          aria-label="关闭"
          data-test="app-event-dialog-close"
          @click="open = false"
        >
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>

      <div class="k2-modal__bar">
        <span class="k2-modal__filter">
          <v-icon size="14">mdi-filter-variant</v-icon>
          当前来源：<strong>{{ filterLabel }}</strong>
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

      <div class="k2-modal__list">
        <EventRow
          v-for="event in events"
          :key="event.id"
          :event="event"
          :time="timeOf?.(event)"
          :rest-sources="restOf?.(event)"
          @open="emit('open', $event)"
        />
        <div v-if="events.length === 0" class="k2-modal__empty">这一条来源下暂时没有事件</div>
      </div>

      <div class="k2-modal__foot">
        <span class="k2-modal__stat">已展示 {{ events.length }} 条事件</span>
        <button type="button" class="k2-btn k2-btn--primary" @click="open = false">
          {{ doneLabel }}
        </button>
      </div>
    </div>
  </v-dialog>
</template>
