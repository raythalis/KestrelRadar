<!-- AppSidebar：导航的唯一来源。桌面是浮起的圆角卡片（可收成图标轨道），窄屏是抽屉（同一份 items）。
     收起状态记在 ui store（本地存储 kestrel-ui）；窄屏点遮罩或选完导航自动收起（关抽屉由外壳控制）。
     折叠把手只在桌面出现——窄屏走抽屉，不需要它。 -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

import { useUiStore } from '@/stores/ui'

import type { AppNavItem } from './types'

withDefaults(
  defineProps<{
    items: AppNavItem[]
    /** 窄屏抽屉是否展开（桌面忽略） */
    open?: boolean
    brand?: {
      name: string
      /** 品牌标图片地址；不给就只显示文字标 */ logo?: string
    }
    closeLabel?: string
    /** 折叠把手的无障碍名：收起时是「展开侧栏」，展开时是「收起侧栏」 */
    expandLabel?: string
    collapseLabel?: string
    version?: string
  }>(),
  { open: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()
const route = useRoute()
const ui = useUiStore()
</script>

<template>
  <!-- 包裹层只用来放「遮罩 + 侧栏 + 底部导航」三个兄弟节点，自己不参与布局：
       外壳是 CSS Grid，侧栏要作为网格项才能撑满整列高度（display: contents，见 v2.scss） -->
  <div class="k2-nav-wrap">
    <button
      v-if="open"
      type="button"
      class="k2-scrim"
      data-test="drawer-scrim"
      :aria-label="closeLabel"
      @click="emit('close')"
    />

    <aside class="k2-nav" :class="{ 'is-open': open }">
      <div v-if="brand" class="k2-nav__brand">
        <img v-if="brand.logo" class="k2-nav__logo" data-test="app-logo" :src="brand.logo" alt="" />
        <span class="k2-nav__name" data-test="app-name">{{ brand.name }}</span>
      </div>

      <nav class="k2-nav__items">
        <router-link
          v-for="item in items"
          :key="item.name"
          :to="{ name: item.name }"
          class="k2-nav__item"
          :class="{ 'is-active': String(route.name ?? '') === item.name }"
          :data-test="`nav-${item.name}`"
        >
          <v-icon class="k2-nav__icon" size="20">{{ item.icon }}</v-icon>
          <span class="k2-nav__label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div v-if="version" class="k2-nav__foot">{{ version }}</div>

      <button
        type="button"
        class="k2-nav__handle"
        :aria-expanded="!ui.sidebarCollapsed"
        :aria-label="ui.sidebarCollapsed ? expandLabel : collapseLabel"
        :title="ui.sidebarCollapsed ? expandLabel : collapseLabel"
        data-test="nav-handle"
        @click="ui.setSidebarCollapsed(!ui.sidebarCollapsed)"
      >
        <v-icon size="16">mdi-chevron-left</v-icon>
      </button>
    </aside>
  </div>
</template>
