<!-- AppPanel：定高面板。头部固定、内容区自己滚、底部可选一条入口。
     仪表盘两栏（最近事件 / 异常记录）用它：两栏同高，长短不一也不会互相拉高，
     长列表在面板内部滚动，整页高度不被列表撑开。
     只负责版面，不管内容——标题、筛选、空态都由调用方放进插槽。
     高度默认跟视口走，并按「有没有底栏」换算：内容区顶部给第一个条目留一条小间隙（--k2-s-1），
     加到面板高度里；没有底栏的面板把底栏那一条高度减掉——否则去掉底栏后列表窗口会白长高一条。 -->
<script setup lang="ts">
import { computed, useSlots } from 'vue'

/** 底栏那一条的高度：s-3 上下内边距 + 一行文字 + 1px 分线 */
const PANEL_FOOT_H = 44

const props = withDefaults(
  defineProps<{
    /** 面板高度：不传就按「视口 + 有没有底栏」算 */
    height?: string
    /** 内容超出时是否在面板内滚动 */
    scroll?: boolean
  }>(),
  { scroll: true },
)

const slots = useSlots()
const blockSize = computed(() => {
  if (props.height) return props.height
  const base = 'calc(min(62vh, 620px) + var(--k2-s-1)'
  return slots.foot ? `${base})` : `${base} - ${PANEL_FOOT_H}px)`
})
</script>

<template>
  <section class="k2-panel" :style="{ blockSize }" data-test="app-panel">
    <header v-if="$slots.head" class="k2-panel__head" data-test="app-panel-head">
      <slot name="head" />
    </header>
    <div
      class="k2-panel__body"
      :class="{ 'k2-panel__body--scroll': scroll }"
      data-test="app-panel-body"
    >
      <slot />
    </div>
    <footer v-if="$slots.foot" class="k2-panel__foot" data-test="app-panel-foot">
      <slot name="foot" />
    </footer>
  </section>
</template>
