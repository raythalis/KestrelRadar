<!-- AppInput：单行文本输入（内含 Vuetify 的 v-text-field，只做 DS 包装）。
     状态：default / focus / filled / disabled / readonly / error / 校验提示。 -->
<script setup lang="ts">
import AppButton from './AppButton.vue'

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
    type?: string
    autocomplete?: string
    /** 后面跟一个"测试/检查"这类动作时用（例如 RSSHub 的试抓） */
    actionLabel?: string
    actionLoading?: boolean
    /** 等宽显示（cron 表达式、地址、路由路径这类要按字符对齐的值） */
    mono?: boolean
    /** 固定前缀（不可编辑的一段，例如 RSSHub 实例地址）；值里不含它，只负责显示 */
    prefix?: string
  }>(),
  { type: 'text', disabled: false, readonly: false, required: false, mono: false },
)

const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <div class="app-field" data-test="app-input">
    <label v-if="label" class="app-field__label">
      {{ label }}<span v-if="required" class="app-field__req">*</span>
    </label>
    <div class="app-field__row">
      <div class="app-field__group" :class="{ 'is-prefixed': Boolean(prefix) }">
        <span v-if="prefix" class="app-field__prefix" data-test="app-input-prefix">{{
          prefix
        }}</span>
        <v-text-field
          v-model="model"
          :type="type"
          :placeholder="placeholder"
          :autocomplete="autocomplete"
          :disabled="disabled"
          :readonly="readonly"
          :error="Boolean(error)"
          :class="{ 'is-readonly': readonly && !disabled, 'font-mono': mono }"
        />
      </div>
      <slot name="action">
        <AppButton v-if="actionLabel" size="sm" :loading="actionLoading" @click="emit('action')">
          {{ actionLabel }}
        </AppButton>
      </slot>
    </div>
    <span v-if="error" class="app-field__error">{{ error }}</span>
    <span v-else-if="hint" class="app-field__hint">{{ hint }}</span>
  </div>
</template>
