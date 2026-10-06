<!-- AppSourceFilter：面板头部右侧的「筛选」。按钮 + 浮层（按信息来源看事件）。
     浮层结构照参考稿：标题/副标题/关闭 → 选项（圆点 + 名称 + 条数）→ 重置。
     浮层挂在 body 上（VMenu teleport），不会被面板的滚动容器裁掉。
     copy 全走 props：组件本身不写死文案，由页面（或 Style Lab）给。 -->
<script setup lang="ts">
import { computed, ref } from 'vue'

export interface SourceFilterOption {
  /** 取值：来源 id；空串是「全部来源」那一项 */
  id: string
  name: string
  count: number
}

const props = withDefaults(
  defineProps<{
    options: SourceFilterOption[]
    /** 选中的来源 id；空串表示全部来源 */
    modelValue: string
    /** 浮层标题与副标题 */
    title?: string
    note?: string
    resetLabel?: string
    /** 还没选具体来源时，按钮上的字 */
    filterLabel?: string
  }>(),
  {
    title: '筛选事件',
    note: '按信息来源查看',
    resetLabel: '重置筛选',
    filterLabel: '筛选',
  },
)

/** 按钮上显示当前选中的来源名；没筛（空串）或对不上就显示 filterLabel */
const selected = computed(() =>
  props.modelValue === ''
    ? null
    : (props.options.find((option) => option.id === props.modelValue) ?? null),
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; reset: [] }>()

/** 浮层开合：右上角的关闭按钮要真的能关，所以自己拿着开合状态 */
const menuOpen = ref(false)
</script>

<template>
  <span class="k2-filter" data-test="app-source-filter">
    <VMenu
      v-model="menuOpen"
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
          :class="{ 'k2-panel__quiet--on': modelValue !== '' }"
          data-test="app-source-filter-trigger"
        >
          <v-icon size="14">mdi-filter-variant</v-icon>
          {{ selected ? selected.name : filterLabel }}
        </button>
      </template>

      <div class="k2-pop__head">
        <span class="k2-pop__heading">
          <span class="k2-pop__title">{{ title }}</span>
          <span class="k2-pop__note">{{ note }}</span>
        </span>
        <button
          type="button"
          class="k2-pop__close"
          aria-label="关闭"
          data-test="app-source-filter-close"
          @click="menuOpen = false"
        >
          <v-icon size="15">mdi-close</v-icon>
        </button>
      </div>

      <div class="k2-pop__options" data-test="app-source-filter-options">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="k2-pop__option"
          :class="{ 'k2-pop__option--on': option.id === modelValue }"
          data-test="app-source-filter-option"
          @click="emit('update:modelValue', option.id)"
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
