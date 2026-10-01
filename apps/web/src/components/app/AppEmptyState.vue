<!-- AppEmptyState：空状态。两种用法：
     purely informational（只有 title/note）/ with action（actions 插槽放按钮）。 -->
<script setup lang="ts">
withDefaults(defineProps<{ title?: string; note?: string; icon?: string }>(), {})
</script>

<template>
  <div class="app-empty" data-test="app-empty">
    <v-icon v-if="icon" size="22" class="app-empty__icon">{{ icon }}</v-icon>
    <span v-if="title" class="app-empty__title">{{ title }}</span>
    <span v-if="note" class="app-empty__note">{{ note }}</span>
    <div v-if="$slots.actions" class="app-empty__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
