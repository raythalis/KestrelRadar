<!-- AppSourceFilter：面板头部右侧的「筛选」。按钮 + 浮层（按信息来源看事件）。
     浮层结构照参考稿：标题/副标题/关闭 → 选项（圆点 + 名称 + 条数）→ 重置。
     浮层挂在 body 上（VMenu teleport），不会被面板的滚动容器裁掉。
     copy 全走 props：组件本身不写死文案，由页面（或 Style Lab）给。 -->
<script setup lang="ts">
export interface SourceFilterOption {
  name: string
  count: number
}

withDefaults(
  defineProps<{
    options: SourceFilterOption[]
    modelValue: string
    /** 浮层标题与副标题 */
    title?: string
    note?: string
    /** 「全部来源」那一项的名字 */
    allLabel?: string
    resetLabel?: string
  }>(),
  {
    title: '筛选事件',
    note: '按信息来源查看',
    allLabel: '全部来源',
    resetLabel: '重置筛选',
  },
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; reset: [] }>()
</script>

<template>
  <span class="k2-filter" data-test="app-source-filter">
    <VMenu
      :close-on-content-click="false"
      content-class="k2-pop k2-pop--filter"
      location="bottom end"
      :offset="6"
    >
      <template #activator="{ props: menuProps }">
        <button
          v-bind="menuProps"
          type="button"
          class="k2-panel__quiet"
          :class="{ 'k2-panel__quiet--on': modelValue !== allLabel }"
          data-test="app-source-filter-trigger"
        >
          <v-icon size="14">mdi-filter-variant</v-icon>
          {{ modelValue === allLabel ? '筛选' : modelValue }}
        </button>
      </template>

      <div class="k2-pop__head">
        <span class="k2-pop__heading">
          <span class="k2-pop__title">{{ title }}</span>
          <span class="k2-pop__note">{{ note }}</span>
        </span>
        <button type="button" class="k2-pop__close" aria-label="关闭">
          <v-icon size="15">mdi-close</v-icon>
        </button>
      </div>

      <div class="k2-pop__options" data-test="app-source-filter-options">
        <button
          v-for="option in options"
          :key="option.name"
          type="button"
          class="k2-pop__option"
          :class="{ 'k2-pop__option--on': option.name === modelValue }"
          data-test="app-source-filter-option"
          @click="emit('update:modelValue', option.name)"
        >
          <span class="k2-pop__radio"><span /></span>
          <span class="k2-ellipsis">{{ option.name }}</span>
          <span class="k2-pop__count">{{ option.count }}</span>
        </button>
      </div>

      <button
        type="button"
        class="k2-pop__reset"
        data-test="app-source-filter-reset"
        @click="emit('reset')"
      >
        {{ resetLabel }}
      </button>
    </VMenu>
  </span>
</template>
