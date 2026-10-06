<!-- AppSkeleton：加载骨架。四种版面：card（卡片内容）/ list（列表行）/ page（页面首屏）/ text。
     基础形状用 V2 的 .k2-skeleton + --line/--title/--block/--dot（微光与底色都来自 --k2-* token）。 -->
<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'text' | 'card' | 'list' | 'page'; rows?: number }>(), {
  variant: 'text',
  rows: 3,
})
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
      <div
        v-for="n in rows"
        :key="n"
        class="k2-skeleton k2-skeleton--line"
        :style="{ width: `${92 - n * 8}%` }"
      />
      <div class="k2-skeleton k2-skeleton--block" />
    </template>

    <template v-else-if="variant === 'list'">
      <div v-for="n in rows" :key="n" class="k2-skeleton-row">
        <div class="k2-skeleton k2-skeleton--dot" />
        <div class="k2-skeleton-row__lines">
          <div class="k2-skeleton k2-skeleton--line" style="width: 46%" />
          <div class="k2-skeleton k2-skeleton--line" style="width: 28%" />
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
