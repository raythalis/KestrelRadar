<!-- AppTag：标签/徽标的唯一来源。
     业务卡片上到处都要小标签（类型、状态、路由），页面不该自己拼 class，所以补这一层。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    /** neutral=普通  accent=强调（类型）  ok/warn/err=状态 */
    tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'err'
    /** 等宽（表达式、地址、路由这类要按字符对齐的值） */
    mono?: boolean
  }>(),
  { tone: 'neutral', mono: false },
)
</script>

<template>
  <span
    class="app-tag"
    :class="[tone === 'neutral' ? '' : `app-tag--${tone}`, mono ? 'font-mono' : '']"
    data-test="app-tag"
  >
    <slot />
  </span>
</template>
