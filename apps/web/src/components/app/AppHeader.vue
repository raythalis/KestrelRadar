<!-- AppHeader：顶栏。窄屏左边是抽屉开关、中间是当前页标题；桌面只留右侧操作。
     操作区（语言、主题切换等）由外壳通过 actions 插槽传进来。 -->
<script setup lang="ts">
defineProps<{ title?: string; menuLabel?: string }>()
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

    <span class="app-topbar__title" data-test="page-title">
      <slot name="title">{{ title }}</slot>
    </span>

    <span class="app-spacer" />

    <div class="app-topbar__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
