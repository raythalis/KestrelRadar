<!-- AppTabs：标签切换（下划线式），吸收生产 GroupPanel 里那套 .k2-tabs 结构。
     只做受控切换：v-model 是当前选中项的值，自己不存状态。count 是可选的尾部计数。
     说明：.k2-tabs 本身是窄屏用的（桌面隐藏），需要桌面常显时由调用方自己控制显隐；
     本组件不提供键盘方向键导航（WAI-ARIA tabs 的 arrow-key 那部分不承诺）。 -->
<script setup lang="ts">
import type { AppTabItem } from '@/components/app/types'

withDefaults(
  defineProps<{
    /** 当前选中项的值（受控：只认这个 prop） */
    modelValue?: string
    items: AppTabItem[]
    /** 无障碍标签（读屏用），不是可见文字 */
    label?: string
  }>(),
  { modelValue: '', label: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="k2-tabs" role="tablist" :aria-label="label" data-test="app-tabs">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      class="k2-tabs__item"
      :class="{ 'k2-tabs__item--on': item.value === modelValue }"
      :aria-selected="item.value === modelValue"
      :data-test="`app-tab-${item.value}`"
      @click="emit('update:modelValue', item.value)"
    >
      <v-icon v-if="item.icon" size="16">{{ item.icon }}</v-icon>
      <span class="k2-tabs__label">{{ item.label }}</span>
      <span v-if="item.count !== undefined" class="k2-tabs__count">{{ item.count }}</span>
    </button>
  </div>
</template>
