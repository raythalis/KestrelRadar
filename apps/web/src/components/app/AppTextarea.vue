<!-- AppTextarea：多行文本。与 AppInput 同一套 V2 字段体系（k2-field 家族），
     控件是原生 textarea + .k2-textarea（保留多行语义：rows、最小高度、纵向 resize、多行行高）。
     error 时描边走危险色，说明文字让位给错误。 -->
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
  <label class="k2-field" data-test="app-textarea">
    <span v-if="label" class="k2-field__label">
      {{ label }}<span v-if="required" class="k2-field__req">*</span>
    </span>

    <span class="k2-field__row">
      <textarea
        v-model="model"
        class="k2-textarea"
        :class="{ 'k2-textarea--err': Boolean(error) }"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
      />
    </span>

    <span v-if="error" class="k2-field__err">{{ error }}</span>
    <span v-else-if="hint" class="k2-field__hint">{{ hint }}</span>
  </label>
</template>
