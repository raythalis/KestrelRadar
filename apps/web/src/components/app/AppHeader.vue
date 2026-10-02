<!-- AppHeader：顶栏。窄屏是「抽屉开关 + 中间文字品牌标 + 右侧操作」；桌面只留右侧操作。
     这里不显示页名：一页的标题由页面的 AppPage 承担，顶栏再写一遍就是同一句话说两次。
     操作区（语言、主题切换等）由外壳通过 actions 插槽传进来。 -->
<script setup lang="ts">
withDefaults(defineProps<{ brand?: string; menuLabel?: string }>(), { brand: '' })
const emit = defineEmits<{ (e: 'toggle-menu'): void }>()
</script>

<template>
  <header class="app-topbar">
    <button
      type="button"
      class="app-iconbtn app-topbar__menu"
      data-test="drawer-toggle"
      :aria-label="menuLabel"
      @click="emit('toggle-menu')"
    >
      <v-icon size="18">mdi-menu</v-icon>
    </button>

    <span v-if="brand" class="app-topbar__brand" data-test="topbar-brand">{{ brand }}</span>

    <span class="app-spacer" />

    <div class="app-topbar__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
