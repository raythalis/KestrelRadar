<!-- AppEmptyState：空状态。两种用法：
     purely informational（只有 title/note）/ with action（actions 插槽放按钮）。
     V2 结构＝生产页面里已在用的 .k2-empty 家族（ChannelsView / ConfigView / DashboardView / ModelsView）。
     注意：icon 只能用 mdi 裁剪子集里已注册的名字，写别的名字不会显示。 -->
<script setup lang="ts">
withDefaults(defineProps<{ title?: string; note?: string; icon?: string }>(), {})
</script>

<template>
  <div class="k2-empty" data-test="app-empty">
    <v-icon v-if="icon" size="22" class="k2-empty__icon">{{ icon }}</v-icon>
    <span v-if="title" class="k2-empty__title">{{ title }}</span>
    <span v-if="note" class="k2-empty__sub">{{ note }}</span>
    <div v-if="$slots.actions" class="k2-empty__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
