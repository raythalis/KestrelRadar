<!-- AppSection：页面内的分节（标题 + 说明 + 右侧操作 + 内容）。 -->
<script setup lang="ts">
defineProps<{ title?: string; note?: string }>()
</script>

<template>
  <section class="app-section" data-test="app-section">
    <div v-if="title || note || $slots.actions" class="app-section__head">
      <h2 v-if="title" class="app-section__title">{{ title }}</h2>
      <span v-if="note" class="app-section__note">{{ note }}</span>
      <span class="app-spacer" />
      <div v-if="$slots.actions" class="app-section__actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
