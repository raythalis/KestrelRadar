<!-- EventRow：仪表盘最近事件的一行。
     结构＝生产在用的 .k2-row 家族（图标 / 标题 / 来源标签 / 时间 / 箭头），
     新增的只有右上角那颗未读圆点：实心＝从没看过这件事（接口的 readAt 为空）。
     行可点开时用 a 标签，点击同时把 open 抛给页面（页面负责记已读）。 -->
<script setup lang="ts">
import type { EventSourceRef, RecentEvent } from '@kestrel/contracts'
import { computed } from 'vue'

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

/** 行首图标色调跟着来源类型走（和发现卡的图标记法一致） */
const tone = computed(() => {
  if (props.event.kind === 'rsshub') return 'info'
  if (props.event.kind === 'web') return 'neutral'
  return 'primary'
})
</script>

<template>
  <component
    :is="event.url ? 'a' : 'article'"
    class="k2-row k2-row--link k2-list__row"
    :class="`k2-t-${tone}`"
    v-bind="event.url ? { href: event.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
    data-test="event-row"
    @click="emit('open', event)"
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
        @more="emit('more', event)"
      />
    </span>
    <span class="k2-list__side">
      <span v-if="time" class="k2-row__sub k2-row__time" data-test="event-time">
        <v-icon size="13">mdi-clock-outline</v-icon>
        <span>{{ time }}</span>
      </span>
    </span>
    <span v-if="!event.readAt" class="k2-row__dot" aria-hidden="true" data-test="event-unread" />
    <span v-if="event.url" class="k2-list__chevron">
      <v-icon size="20">mdi-chevron-right</v-icon>
    </span>
  </component>
</template>
