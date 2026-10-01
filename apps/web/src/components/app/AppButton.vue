<!-- AppButton：按钮的唯一来源（视觉在 styles/components.scss 的 .app-btn）。
     状态：default / hover / active / disabled / loading / danger。内部不用 v-btn：DS 的高度、
     圆角、字号都是自己的规矩，直接用原生 button + DS 类更可控。 -->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** primary=主操作 secondary=常规 ghost=弱化 danger=危险 */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    /** 加载中：显示转圈并自动禁用，避免重复提交 */
    loading?: boolean
    disabled?: boolean
    /** 撑满父容器宽度（弹窗底部、移动端） */
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
  },
)

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

// 加载中不能重复提交，但外观要保持可用的主色（真禁用才变灰）。
// 所以 loading 时不打 disabled 属性，改成挡住这次点击、不往外抛事件。
function onClick(event: MouseEvent): void {
  if (props.loading) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    class="app-btn"
    :class="[
      `app-btn--${variant}`,
      size === 'sm' ? 'app-btn--sm' : '',
      block ? 'app-btn--block' : '',
      loading ? 'is-loading' : '',
    ]"
    :type="type"
    :disabled="disabled"
    :aria-disabled="loading || undefined"
    :aria-busy="loading || undefined"
    data-test="app-button"
    @click="onClick"
  >
    <span v-if="loading" class="app-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
