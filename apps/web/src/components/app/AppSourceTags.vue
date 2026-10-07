<!-- AppSourceTags：事件行的来源标签组。最多挂 limit 个，多出来的收成一个「+N」。
     每个标签直接指向那一家的原文；点击不冒泡（行本身是可点开的，别抢了行的动作）。
     「+N」点开是一个浮层，把这一件事的来源全列出来（哪一家、点了去哪），
       最多显示 4 条的高度，再多就在浮层里滚——所以浮层必须挂在 body 上（VMenu 会 teleport），
       不然会被面板的滚动容器裁掉。
     数据来源：sources 是接口直接给的（前两个，带链接）；rest 是页面按需取回来的其余来源。
       还没取回来时只抛 more，由页面去取。
     类名特意用 k2-source-tags：k2-tags 是排除词输入框（TagsField）的类，撞上会被套成输入框。 -->
<script setup lang="ts">
import { EVENT_SOURCE_TAG_LIMIT, type EventSourceRef } from '@kestrel/contracts'
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    sources: EventSourceRef[]
    /** 一共几个来源；没说就按 sources 的条数算 */
    total?: number
    limit?: number
    /** 第 limit 个之后的来源（页面按需取回来的那份完整列表） */
    rest?: EventSourceRef[]
    /** 「+N」按钮上的话：条数由组件给，文案由页面给 */
    moreOf?: (count: number) => string
    /** 浮层标题 */
    title?: string
    /** 浮层副标题：家数由组件给，文案由页面给 */
    noteOf?: (count: number) => string
    /** 关闭按钮的无障碍名 */
    closeLabel?: string
  }>(),
  { total: 0, limit: EVENT_SOURCE_TAG_LIMIT },
)
const emit = defineEmits<{ more: [] }>()

const open = ref(false)

const shown = computed(() => props.sources.slice(0, props.limit))
/** 浮层里的完整列表：前两个 + 取回来的其余（按 discoveryId 去重，顺序保持稳定） */
const all = computed(() => {
  const seen = new Set<string>()
  return [...shown.value, ...(props.rest ?? [])].filter((s) => {
    if (seen.has(s.discoveryId)) return false
    seen.add(s.discoveryId)
    return true
  })
})
const restCount = computed(() =>
  Math.max((props.total || props.sources.length) - shown.value.length, (props.rest ?? []).length),
)

function onToggle(value: boolean): void {
  if (value && (props.rest ?? []).length === 0 && restCount.value > 0) emit('more')
}
</script>

<template>
  <span class="k2-source-tags" data-test="app-source-tags">
    <component
      :is="source.url ? 'a' : 'span'"
      v-for="source in shown"
      :key="source.discoveryId"
      class="k2-chip k2-chip--tag"
      :title="source.name"
      v-bind="source.url ? { href: source.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
      @click.stop
    >
      {{ source.name }}
    </component>

    <VMenu
      v-if="restCount > 0"
      v-model="open"
      :close-on-content-click="false"
      content-class="k2-pop k2-pop--sources"
      location="bottom start"
      :offset="6"
      @update:model-value="onToggle"
    >
      <template #activator="{ props: menuProps }">
        <button
          v-bind="menuProps"
          type="button"
          class="k2-chip k2-chip--tag k2-source-tags__more"
          data-test="app-source-tags-more"
          :aria-label="moreOf?.(restCount)"
          :title="moreOf?.(restCount)"
          @click.stop
        >
          +{{ restCount }}
        </button>
      </template>

      <div class="k2-pop__head">
        <span class="k2-pop__heading">
          <span class="k2-pop__title">{{ title }}</span>
          <span class="k2-pop__note">{{ noteOf?.(all.length) }}</span>
        </span>
        <button
          type="button"
          class="k2-pop__close"
          :aria-label="closeLabel"
          data-test="app-source-tags-close"
          @click="open = false"
        >
          <v-icon size="15">mdi-close</v-icon>
        </button>
      </div>

      <div class="k2-pop__list" data-test="app-source-tags-list">
        <component
          :is="source.url ? 'a' : 'span'"
          v-for="source in all"
          :key="source.discoveryId"
          class="k2-pop__item"
          v-bind="
            source.url ? { href: source.url, target: '_blank', rel: 'noopener noreferrer' } : {}
          "
        >
          <span class="k2-ellipsis">{{ source.name }}</span>
          <v-icon v-if="source.url" size="14">mdi-web</v-icon>
        </component>
      </div>
    </VMenu>
  </span>
</template>
