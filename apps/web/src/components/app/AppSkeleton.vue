<!-- AppSkeleton：加载骨架。四种版面：card（卡片内容）/ list（列表行）/ page（页面首屏）/ text。
     list 可选首列形态（圆点 / 方块 / 无）与疏密（常规 / 紧凑），compact 用于事件、故障这类日志行；
     card 可选在内容行之后追加一排方块（blocks，默认 0 不渲染）。
     基础形状用 V2 的 .k2-skeleton + --line/--title/--block/--dot/--sub（微光与底色都来自 --k2-* token）。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'text' | 'card' | 'list' | 'page'
    rows?: number
    /** list：首列形态。dot＝圆点（默认）/ tile＝方块 / none＝无首列 */
    leading?: 'dot' | 'tile' | 'none'
    /** list：疏密。default＝细线（默认）/ compact＝短粗副条，用于日志式列表 */
    density?: 'default' | 'compact'
    /** card：内容行之后追加的方块数。0＝不渲染（保持原样） */
    blocks?: number
    /** card：是否渲染内容区（内容行 + 底部内容块）。false 只留标题与方块，用于「标题 + 方块」型卡片 */
    body?: boolean
  }>(),
  { variant: 'text', rows: 3, leading: 'dot', density: 'default', blocks: 0, body: true },
)
</script>

<template>
  <div class="k2-skeleton-group" data-test="app-skeleton">
    <template v-if="variant === 'text'">
      <div class="k2-skeleton k2-skeleton--line" style="width: 60%" />
      <div class="k2-skeleton k2-skeleton--line" style="width: 92%" />
      <div class="k2-skeleton k2-skeleton--line" style="width: 74%" />
    </template>

    <template v-else-if="variant === 'card'">
      <div class="k2-skeleton k2-skeleton--title" style="width: 32%" />
      <template v-if="body">
        <div
          v-for="n in rows"
          :key="n"
          class="k2-skeleton k2-skeleton--line"
          :style="{ width: `${92 - n * 8}%` }"
        />
      </template>
      <div v-if="body" class="k2-skeleton k2-skeleton--block" />
      <div v-if="blocks > 0" class="k2-skeleton-cells">
        <div v-for="n in blocks" :key="n" class="k2-skeleton k2-skeleton--cell" />
      </div>
    </template>

    <template v-else-if="variant === 'list'">
      <div
        v-for="n in rows"
        :key="n"
        class="k2-skeleton-row"
        :class="{ 'k2-skeleton-row--compact': density === 'compact' }"
      >
        <div v-if="leading === 'dot'" class="k2-skeleton k2-skeleton--dot" />
        <div v-else-if="leading === 'tile'" class="k2-skeleton k2-skeleton--lead" />
        <div class="k2-skeleton-row__lines">
          <div class="k2-skeleton k2-skeleton--line" style="width: 46%" />
          <div v-if="density === 'compact'" class="k2-skeleton k2-skeleton--sub" />
          <div v-else class="k2-skeleton k2-skeleton--line" style="width: 28%" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="k2-skeleton k2-skeleton--title" style="width: 26%" />
      <div class="k2-skeleton k2-skeleton--line" style="width: 48%" />
      <div class="k2-skeleton-row">
        <div class="k2-skeleton k2-skeleton--block" />
        <div class="k2-skeleton k2-skeleton--block" />
      </div>
    </template>
  </div>
</template>
