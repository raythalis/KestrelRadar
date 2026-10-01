<!-- AppHint：内联提示条。tone: info / ok / warn / err。 -->
<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'info' | 'ok' | 'warn' | 'err' }>(), { tone: 'info' })
</script>

<template>
  <div class="app-hint" :class="`app-hint--${tone}`" role="status" data-test="app-hint">
    <slot />
  </div>
</template>
