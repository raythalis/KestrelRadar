<!-- AppTextarea：多行文本（跟 AppInput 同一套状态与留白，只是变成几行）。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    /** 常态说明；有 error 时让位给错误信息 */
    hint?: string
    error?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    placeholder?: string
    /** 行数 */
    rows?: number
    /** 最多多少字（后端也有上限，这里先拦住） */
    maxlength?: number
  }>(),
  { disabled: false, readonly: false, required: false, rows: 3 },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="app-field" data-test="app-textarea">
    <label v-if="label" class="app-field__label">
      {{ label }}<span v-if="required" class="app-field__req">*</span>
    </label>
    <v-textarea
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :error="Boolean(error)"
      :maxlength="maxlength"
      :class="{ 'is-readonly': readonly && !disabled }"
      variant="outlined"
      density="compact"
      hide-details
    />
    <span v-if="error" class="app-field__error">{{ error }}</span>
    <span v-else-if="hint" class="app-field__hint">{{ hint }}</span>
  </div>
</template>
