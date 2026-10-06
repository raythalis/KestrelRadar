<!-- AppSourceTags：事件行的来源标签组。最多挂 limit 个，多出来的收成一个「+N」。
     每个标签直接指向那一家的原文；点击不冒泡（行本身是可点开的，别抢了行的动作）。
     「+N」：给了 rest（完整来源列表）就地点开，把剩下的来源直接摊出来——否则只 emit more，
      由页面自己去取（接口只返回前两个来源的完整信息，多的按需取）。
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
    /** 第 limit 个之后的来源（按需取回来的那份完整列表）；给了就能就地展开 */
    rest?: EventSourceRef[]
  }>(),
  { total: 0, limit: EVENT_SOURCE_TAG_LIMIT },
)
const emit = defineEmits<{ more: [] }>()

const expanded = ref(false)
const shown = computed(() => props.sources.slice(0, props.limit))
const hidden = computed(() => props.rest ?? [])
const restCount = computed(() =>
  Math.max((props.total || props.sources.length) - shown.value.length, hidden.value.length),
)
const listed = computed(() => (expanded.value ? [...shown.value, ...hidden.value] : shown.value))

function onMore(): void {
  if (hidden.value.length > 0) {
    expanded.value = true
    return
  }
  emit('more')
}
</script>

<template>
  <span class="k2-source-tags" data-test="app-source-tags">
    <component
      :is="source.url ? 'a' : 'span'"
      v-for="source in listed"
      :key="source.discoveryId"
      class="k2-chip k2-chip--tag"
      :title="source.name"
      v-bind="source.url ? { href: source.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
      @click.stop
    >
      {{ source.name }}
    </component>
    <button
      v-if="!expanded && restCount > 0"
      type="button"
      class="k2-chip k2-chip--tag k2-source-tags__more"
      data-test="app-source-tags-more"
      :aria-label="`展开其余 ${restCount} 个来源`"
      :title="`展开其余 ${restCount} 个来源`"
      @click.stop="onMore"
    >
      +{{ restCount }}
    </button>
  </span>
</template>
