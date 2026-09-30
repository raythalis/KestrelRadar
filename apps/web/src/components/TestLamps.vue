<script setup lang="ts">
defineProps<{
  /** 两级连通性：路由层 + 内容层；null 表示还没测过 */
  routeOk: boolean | null
  contentOk: boolean | null
  message: string
}>()

function lampColor(value: boolean | null): string {
  if (value === null) return 'medium-emphasis'
  return value ? 'success' : 'error'
}
</script>

<template>
  <div class="d-flex align-center ga-3 text-caption" data-test="test-lamps">
    <span class="d-flex align-center ga-1">
      <v-icon :color="lampColor(routeOk)" size="10" icon="mdi-circle" />
      <span>{{ $t('discovery.routeLayer') }}</span>
    </span>
    <span class="d-flex align-center ga-1">
      <v-icon :color="lampColor(contentOk)" size="10" icon="mdi-circle" />
      <span>{{ $t('discovery.contentLayer') }}</span>
    </span>
    <span v-if="message" class="text-medium-emphasis">{{ message }}</span>
  </div>
</template>
