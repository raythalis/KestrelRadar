<!-- AppSelect：下拉选择（内含 v-select）。状态与 AppInput 一致。 -->
<script setup lang="ts">
import type { AppSelectItem } from './types'

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    items: (AppSelectItem | string)[]
    disabled?: boolean
    readonly?: boolean
    placeholder?: string
    /** 多选：值是数组，选中项显示成可删的标签 */
    multiple?: boolean
  }>(),
  { disabled: false, readonly: false, multiple: false },
)

const model = defineModel<string | number | string[] | null>({ default: null })
</script>

<template>
  <div class="app-field" data-test="app-select">
    <label v-if="label" class="app-field__label">{{ label }}</label>
    <v-select
      v-model="model"
      :items="items"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :multiple="multiple"
      :chips="multiple"
      :closable-chips="multiple"
      :error="Boolean(error)"
    >
      <!-- 下拉项要自己画的时候（灰掉某项、右侧挂个动作）由调用方提供 -->
      <template v-if="$slots.item" #item="scope">
        <slot name="item" v-bind="scope" />
      </template>
    </v-select>
    <span v-if="error" class="app-field__error">{{ error }}</span>
    <span v-else-if="hint" class="app-field__hint">{{ hint }}</span>
  </div>
</template>
