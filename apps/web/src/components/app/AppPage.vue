<!-- AppPage：页面容器，也是"内容宽度策略"的落点。
     width：narrow(表单/设置) / default(普通页) / wide(仪表盘·多列配置) / full(不限宽)。
     页面标题由这里承担（顶栏不再重复显示页名）；页面只给标题、说明和内容。

     三种页面级状态统一在这里留位，页面不用自己摆：
       loading → 骨架（想自定义就填 loading 插槽）
       error   → 头部下面一条错误带（页面有内容但没完全加载成功时用）
       empty   → 空态（可配 empty-actions 插槽放按钮）
     优先级：loading > empty > 默认内容。 -->
<script setup lang="ts">
import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppHint from '@/components/app/AppHint.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'

withDefaults(
  defineProps<{
    title?: string
    note?: string
    width?: 'narrow' | 'default' | 'wide' | 'full'
    loading?: boolean
    empty?: boolean
    emptyTitle?: string
    emptyNote?: string
    emptyIcon?: string
    error?: string
  }>(),
  { width: 'default' },
)
</script>

<template>
  <div class="app-page" :class="`app-page--${width}`" data-test="app-page">
    <header v-if="title || note || $slots.note || $slots.actions" class="app-page__head">
      <div>
        <h1 v-if="title" class="app-page__title">{{ title }}</h1>
        <p v-if="note || $slots.note" class="app-page__note">
          <slot name="note">{{ note }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="app-page__actions">
        <slot name="actions" />
      </div>
    </header>

    <AppHint v-if="error" tone="err" class="app-page__error" data-test="app-page-error">
      {{ error }}
    </AppHint>

    <slot v-if="loading" name="loading">
      <AppSkeleton variant="page" />
    </slot>

    <AppEmptyState
      v-else-if="empty"
      :title="emptyTitle"
      :note="emptyNote"
      :icon="emptyIcon"
      data-test="app-page-empty"
    >
      <template v-if="$slots['empty-actions']" #actions>
        <slot name="empty-actions" />
      </template>
    </AppEmptyState>

    <slot v-else />
  </div>
</template>
