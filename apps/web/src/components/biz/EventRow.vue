<!-- EventRow：仪表盘最近事件的一行。
     结构＝生产在用的 .k2-row 家族（图标 / 标题 / 来源标签 / 时间 / 箭头）。
     行本身**不做成 <a>**：里面挂着来源标签（那些是真链接），嵌套 <a> 不是合法结构，
     点标签会被行的跳转抢走。行改成 role=link + 键盘回车，跳转由页面在 open 里做。
     右上角圆点两态：
       实心＝这件事从没看过（readAt 为空）；
       空心圈＝看过之后又有新条目（lastItemAt 晚于 readAt），不退回未读。 -->
<script setup lang="ts">
import type { EventSourceRef, RecentEvent } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppSourceTags from '@/components/app/AppSourceTags.vue'
import { DISCOVERY_ICONS } from '@/components/biz/icons'

const props = defineProps<{
  event: RecentEvent
  /** 时间已经格式化好的样子；不传就不占位 */
  time?: string
  /** 这一件事的其余来源（页面按需取回来的那份），透传给 +N 浮层 */
  restSources?: EventSourceRef[]
}>()
const emit = defineEmits<{ open: [event: RecentEvent]; more: [event: RecentEvent] }>()

const { t } = useI18n()

/** 行首图标色调跟着来源类型走（和发现卡的图标记法一致） */
const tone = computed(() => {
  if (props.event.kind === 'rsshub') return 'info'
  if (props.event.kind === 'web') return 'neutral'
  return 'primary'
})

/** 圆点状态：没看过 / 看过但又有新条目 / 无 */
const dot = computed<'unread' | 'updated' | null>(() => {
  if (!props.event.readAt) return 'unread'
  return new Date(props.event.lastItemAt).getTime() > new Date(props.event.readAt).getTime()
    ? 'updated'
    : null
})

function openRow(): void {
  emit('open', props.event)
}
</script>

<template>
  <component
    :is="event.url ? 'div' : 'article'"
    class="k2-row k2-row--link k2-list__row"
    :class="`k2-t-${tone}`"
    :role="event.url ? 'link' : undefined"
    :tabindex="event.url ? 0 : undefined"
    data-test="event-row"
    @click="openRow"
    @keydown.enter.prevent="openRow"
  >
    <span class="k2-tile k2-tile--sm">
      <v-icon size="20">{{ DISCOVERY_ICONS[event.kind] }}</v-icon>
    </span>
    <span class="k2-list__main">
      <span class="k2-row__title k2-ellipsis">{{ event.title }}</span>
      <AppSourceTags
        :sources="event.sources"
        :total="event.sourceCount"
        :rest="restSources"
        :more-of="(count) => t('dashboard.events.sourceMore', { n: count })"
        :title="t('dashboard.events.sourceTitle')"
        :note-of="(count) => t('dashboard.events.sourceNote', { n: count })"
        :close-label="t('common.close')"
        @more="emit('more', event)"
      />
    </span>
    <span class="k2-list__side">
      <span v-if="time" class="k2-row__sub k2-row__time" data-test="event-time">
        <v-icon size="13">mdi-clock-outline</v-icon>
        <span>{{ time }}</span>
      </span>
    </span>
    <span
      v-if="dot"
      class="k2-row__dot"
      :class="{ 'k2-row__dot--updated': dot === 'updated' }"
      :data-test="dot === 'unread' ? 'event-unread' : 'event-updated'"
      aria-hidden="true"
    />
    <span v-if="event.url" class="k2-list__chevron">
      <v-icon size="20">mdi-chevron-right</v-icon>
    </span>
  </component>
</template>
