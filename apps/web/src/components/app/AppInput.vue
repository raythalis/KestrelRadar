<!-- AppInput：v2 的单行文本字段（.k2-input 骨架 + 标签 / 说明 / 报错 + 有内容时的清空叉）。
     只受控：值在父级，组件只发 update:modelValue；清空也是改值，不走事件。
     固定前缀（例如 RSSHub 站点地址）用 prefix 传，值里不含它。
     后面跟「测试/检查」这类动作时用 actionLabel（或 action 插槽）。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from './AppButton.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    /** 常态说明；有 error 时让位给报错那句 */
    hint?: string
    /** 报错那句（同时把描边换成危险色） */
    error?: string
    /** 只要危险描边、报错那句自己在外头渲染时用 */
    invalid?: boolean
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    placeholder?: string
    type?: string
    autocomplete?: string
    /** 后面跟一个「测试/检查」这类动作时用（例如 RSSHub 的试抓） */
    actionLabel?: string
    actionLoading?: boolean
    /** 等宽显示（cron 表达式、地址、路由路径这类要按字符对齐的值） */
    mono?: boolean
    /** 固定前缀（不可编辑的一段，例如 RSSHub 实例地址）；值里不含它，只负责显示 */
    prefix?: string
    maxlength?: number
  }>(),
  { type: 'text', disabled: false, readonly: false, required: false, mono: false, invalid: false },
)

const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ (e: 'action'): void }>()

const { t } = useI18n()

/** 清空叉：有内容、且不是禁用/只读才给 */
const clearable = computed(() => !props.disabled && !props.readonly && model.value !== '')

function clear(): void {
  model.value = ''
}
</script>

<template>
  <label class="k2-field" data-test="app-input">
    <span v-if="label" class="k2-field__label">
      {{ label }}<span v-if="required" class="k2-field__req">*</span>
    </span>

    <span class="k2-field__row">
      <span class="k2-inputwrap" :class="{ 'k2-inputgroup': prefix, 'is-clearable': clearable }">
        <span
          v-if="prefix"
          class="k2-inputgroup__prefix"
          :title="prefix"
          data-test="app-input-prefix"
        >
          {{ prefix }}
        </span>
        <input
          v-bind="$attrs"
          v-model="model"
          class="k2-input"
          :class="{ 'k2-input--mono': mono, 'k2-input--err': Boolean(error) || invalid }"
          :type="type"
          :placeholder="placeholder"
          :autocomplete="autocomplete"
          :disabled="disabled"
          :readonly="readonly"
          :maxlength="maxlength"
        />
        <button
          v-if="clearable"
          type="button"
          class="k2-inputwrap__clear"
          :aria-label="t('common.clear')"
          data-test="app-input-clear"
          @click.prevent="clear"
        >
          <v-icon size="16">mdi-close-circle</v-icon>
        </button>
      </span>

      <slot name="action">
        <AppButton v-if="actionLabel" size="sm" :loading="actionLoading" @click="emit('action')">
          {{ actionLabel }}
        </AppButton>
      </slot>
    </span>

    <span v-if="error" class="k2-field__err">{{ error }}</span>
    <span v-else-if="hint" class="k2-field__hint">{{ hint }}</span>
  </label>
</template>
