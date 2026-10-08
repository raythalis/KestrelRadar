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

/**
 * 下拉最宽到这里为止（不超过弹窗宽度，窄屏留出边距）。
 * 选项名字再长也不撑破弹窗或屏幕，超出部分用省略号——不设上限时
 * Vuetify 会按最长那一项把菜单撑宽，长名字能把 640 的弹窗撑到 790 多。
 */
const menuProps = {
  maxWidth: 'min(640px, calc(100vw - 2 * var(--k2-s-4)))',
  // 挂个类名：菜单会被 teleport 到 body，样式只能在全局里按这个类名写
  contentClass: 'app-select-menu',
}
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
      :menu-props="menuProps"
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
