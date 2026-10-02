<!-- AppSidebar：导航的唯一来源。桌面是常驻左栏，窄屏是抽屉 + 底部导航（同一份 items，两处渲染）。
     窄屏时点遮罩或选完导航自动收起（关抽屉由外壳控制）。 -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

import type { AppNavItem } from './types'

withDefaults(
  defineProps<{
    items: AppNavItem[]
    /** 窄屏抽屉是否展开（桌面忽略） */
    open?: boolean
    brand?: {
      name: string
      tagline?: string
      /** 品牌标图片地址；不给就只显示文字标 */ logo?: string
    }
    closeLabel?: string
    version?: string
  }>(),
  { open: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()
const route = useRoute()
</script>

<template>
  <div>
    <button
      v-if="open"
      type="button"
      class="app-scrim"
      data-test="drawer-scrim"
      :aria-label="closeLabel"
      @click="emit('close')"
    />

    <aside class="app-rail" :class="{ 'is-open': open }">
      <div v-if="brand" class="app-rail__brand">
        <img
          v-if="brand.logo"
          class="app-rail__logo"
          data-test="app-logo"
          :src="brand.logo"
          alt=""
        />
        <span class="app-rail__name" data-test="app-name">{{ brand.name }}</span>
        <span v-if="brand.tagline" class="app-rail__tagline">{{ brand.tagline }}</span>
      </div>

      <nav class="app-rail__nav">
        <router-link
          v-for="item in items"
          :key="item.name"
          :to="{ name: item.name }"
          class="app-rail__item"
          :class="{ 'is-active': String(route.name ?? '') === item.name }"
          :data-test="`nav-${item.name}`"
        >
          <v-icon size="18">{{ item.icon }}</v-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div v-if="version" class="app-rail__foot">{{ version }}</div>
    </aside>

    <nav class="app-tabbar">
      <router-link
        v-for="item in items"
        :key="item.name"
        :to="{ name: item.name }"
        class="app-tabbar__item"
        :class="{ 'is-active': String(route.name ?? '') === item.name }"
        :data-test="`tab-${item.name}`"
      >
        <v-icon size="18">{{ item.icon }}</v-icon>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>
