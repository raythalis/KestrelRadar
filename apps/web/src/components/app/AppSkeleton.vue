<!-- AppSkeleton：加载骨架。三种版面：card（卡片内容）/ list（列表行）/ page（页面首屏）。 -->
<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'text' | 'card' | 'list' | 'page'; rows?: number }>(), {
  variant: 'text',
  rows: 3,
})
</script>

<template>
  <div class="app-skeleton-group" data-test="app-skeleton">
    <template v-if="variant === 'text'">
      <div class="app-skeleton app-skeleton--text" style="width: 60%" />
      <div class="app-skeleton app-skeleton--text" style="width: 92%" />
      <div class="app-skeleton app-skeleton--text" style="width: 74%" />
    </template>

    <template v-else-if="variant === 'card'">
      <div class="app-skeleton app-skeleton--title" style="width: 32%" />
      <div
        v-for="n in rows"
        :key="n"
        class="app-skeleton app-skeleton--text"
        :style="{ width: `${92 - n * 8}%` }"
      />
      <div class="app-skeleton app-skeleton--block" />
    </template>

    <template v-else-if="variant === 'list'">
      <div v-for="n in rows" :key="n" class="app-skeleton-row">
        <div class="app-skeleton app-skeleton--dot" />
        <div class="app-skeleton-row__lines">
          <div class="app-skeleton app-skeleton--text" style="width: 46%" />
          <div class="app-skeleton app-skeleton--text" style="width: 28%" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="app-skeleton app-skeleton--title" style="width: 26%" />
      <div class="app-skeleton app-skeleton--text" style="width: 48%" />
      <div class="app-skeleton-row">
        <div class="app-skeleton app-skeleton--block" />
        <div class="app-skeleton app-skeleton--block" />
      </div>
    </template>
  </div>
</template>
