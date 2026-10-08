<!-- AppEmptyState：空状态。两种用法：
     purely informational（只有 title/note）/ with action（actions 插槽放按钮）。
     V2 结构＝生产页面里已在用的 .k2-empty 家族（ChannelsView / ConfigView / DashboardView / ModelsView）。
     art：参考稿里那两张插图（事件＝收件箱 + 紫环，异常＝对勾 + 绿环），
          只在活跃区用；不传就还是原来的纯文字 + 单图标。
     注意：icon 只能用 mdi 裁剪子集里已注册的名字，写别的名字不会显示。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{ title?: string; note?: string; icon?: string; art?: 'events' | 'incidents' }>(),
  {},
)
</script>

<template>
  <div class="k2-empty" data-test="app-empty">
    <span v-if="art" class="k2-empty-art" :class="`k2-empty-art--${art}`" aria-hidden="true">
      <span class="k2-empty-art__ring" />
      <span class="k2-empty-art__icon">
        <v-icon size="23">{{
          art === 'incidents' ? 'mdi-check-circle-outline' : 'mdi-inbox-outline'
        }}</v-icon>
      </span>
      <span class="k2-empty-art__spark k2-empty-art__spark--one" />
      <span class="k2-empty-art__spark k2-empty-art__spark--two" />
    </span>
    <v-icon v-else-if="icon" size="22" class="k2-empty__icon">{{ icon }}</v-icon>
    <span v-if="title" class="k2-empty__title">{{ title }}</span>
    <span v-if="note" class="k2-empty__sub">{{ note }}</span>
    <div v-if="$slots.actions" class="k2-empty__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
