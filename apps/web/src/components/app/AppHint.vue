<!-- AppHint：内联提示条。tone: info / ok / warn / err。
     V2 结构＝现有 .k2-alert 骨架 + .k2-t-* 语气 token（与弹窗里的错误带同一套观感）。
     边界：字段内说明用 k2-field__hint、字段校验用 k2-field__err；
     本组件只负责「跨字段 / 区块级、带语气的一行提示」，不接管字段内部提示。 -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ tone?: 'info' | 'ok' | 'warn' | 'err' }>(), {
  tone: 'info',
})

const TONE_CLASS: Record<string, string> = {
  info: 'k2-t-info',
  ok: 'k2-t-success',
  warn: 'k2-t-warning',
  err: 'k2-t-danger',
}

const toneClass = computed(() => TONE_CLASS[props.tone] ?? 'k2-t-info')
</script>

<template>
  <div class="k2-alert" :class="toneClass" role="status" data-test="app-hint">
    <slot />
  </div>
</template>
