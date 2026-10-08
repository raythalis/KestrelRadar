<!-- AppHeader：顶栏。窄屏是「抽屉开关 + 右侧操作」；桌面只留右侧操作（开关由 CSS 藏掉）。
     这里不显示页名：一页的标题由页面自己那份页头承担，顶栏再写一遍就是同一句话说两次。
     操作区（主题切换等）由外壳通过 actions 插槽传进来。 -->
<script setup lang="ts">
defineProps<{ menuLabel?: string }>()
const emit = defineEmits<{ (e: 'toggle-menu'): void }>()
</script>

<template>
  <header class="k2-shell__topbar">
    <button
      type="button"
      class="k2-iconbtn k2-shell__menu"
      data-test="drawer-toggle"
      :aria-label="menuLabel"
      @click="emit('toggle-menu')"
    >
      <v-icon size="20">mdi-menu</v-icon>
    </button>

    <span class="k2-shell__spacer" />

    <div class="k2-shell__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
