<script setup lang="ts">
import type { ChannelType } from '@kestrel/contracts'
import { computed } from 'vue'
import { CHANNEL_ICONS } from './icons'

const props = withDefaults(defineProps<{ type: ChannelType; size?: number }>(), { size: 18 })
const brand = computed(() =>
  ['telegram', 'wecom', 'dingtalk', 'feishu'].includes(props.type) ? props.type : null,
)
</script>

<template>
  <span
    v-if="brand"
    class="k2-channel-brand"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      maskImage: `url(/channel-icons/${brand}.svg)`,
      WebkitMaskImage: `url(/channel-icons/${brand}.svg)`,
    }"
    data-test="channel-brand-icon"
    aria-hidden="true"
  />
  <v-icon v-else :size="size" aria-hidden="true">{{ CHANNEL_ICONS[type] }}</v-icon>
</template>
