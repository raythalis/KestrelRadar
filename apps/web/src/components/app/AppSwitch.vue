<!-- AppSwitch：一行开关（左标签右开关）。状态：on / off / disabled。 -->
<script setup lang="ts">
withDefaults(defineProps<{ label?: string; hint?: string; disabled?: boolean }>(), {
  disabled: false,
})

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <div class="app-switch-row" :class="{ 'is-disabled': disabled }" data-test="app-switch">
    <div class="app-switch-row__text">
      <div v-if="label" class="app-field__label">{{ label }}</div>
      <div v-if="hint" class="app-field__hint">{{ hint }}</div>
    </div>
    <v-switch v-model="model" :disabled="disabled" color="primary" hide-details />
  </div>
</template>
