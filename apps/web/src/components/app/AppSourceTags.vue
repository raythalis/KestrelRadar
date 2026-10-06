<!-- AppSourceTags：事件行的来源标签组。最多挂 limit 个，多出来的收成一个「+N」。
     每个标签直接指向那一家的原文；点击不冒泡（行本身是可点开的，别抢了行的动作）。
     「+N」只告诉调用方要展开完整来源列表，完整列表由页面按需去取。 -->
<script setup lang="ts">
import { EVENT_SOURCE_TAG_LIMIT, type EventSourceRef } from '@kestrel/contracts'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    sources: EventSourceRef[]
    /** 一共几个来源；没说就按 sources 的条数算 */
    total?: number
    limit?: number
  }>(),
  { total: 0, limit: EVENT_SOURCE_TAG_LIMIT },
)
const emit = defineEmits<{ more: [] }>()

const shown = computed(() => props.sources.slice(0, props.limit))
const rest = computed(() => Math.max((props.total || props.sources.length) - shown.value.length, 0))
</script>

<template>
  <span class="k2-tags" data-test="app-source-tags">
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
    <button
      v-if="rest > 0"
      type="button"
      class="k2-chip k2-chip--tag k2-tags__more"
      data-test="app-source-tags-more"
      @click.stop="emit('more')"
    >
      +{{ rest }}
    </button>
  </span>
</template>
