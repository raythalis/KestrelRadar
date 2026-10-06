<!-- LlmPlusTag：判定模式里「LLM+」这个名字的唯一出处（星芒图标 + 绿色）。
     名字两端语言一样，所以不取 i18n；要改图标 / 配色只动这一处。 -->
<template>
  <span class="k2-llmplus k2-t-success" data-test="llm-plus">
    <i class="mdi" :class="LLM_PLUS_ICON" aria-hidden="true" />LLM+
  </span>
</template>

<script setup lang="ts">
import { LLM_PLUS_ICON } from '@/components/biz/icons'
</script>
