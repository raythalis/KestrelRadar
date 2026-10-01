<!-- AppPage：页面容器，也是"内容宽度策略"的落点。
     width：narrow(表单/设置) / default(普通页) / wide(仪表盘·多列配置) / full(不限宽)。
     页面只提供标题、说明与内容，宽度和留白由这里统一决定。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{ title?: string; note?: string; width?: 'narrow' | 'default' | 'wide' | 'full' }>(),
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

    <slot />
  </div>
</template>
