<!-- AppPanel：定高面板。头部固定、内容区自己滚、底部可选一条入口。
     仪表盘两栏（最近事件 / 异常记录）用它：两栏同高，长短不一也不会互相拉高，
     长列表在面板内部滚动，整页高度不被列表撑开。
     只负责版面，不管内容——标题、筛选、空态都由调用方放进插槽。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 面板高度：默认跟视口走，矮屏也不会顶出屏幕 */
    height?: string
    /** 内容超出时是否在面板内滚动 */
    scroll?: boolean
  }>(),
  { height: 'min(62vh, 620px)', scroll: true },
)
</script>

<template>
  <section class="k2-panel" :style="{ blockSize: height }" data-test="app-panel">
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
