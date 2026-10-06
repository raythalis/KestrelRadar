<script setup lang="ts">
import { reactive, ref } from 'vue'

import GroupDialog from '@/components/biz/GroupDialog.vue'
import GroupPanel from '@/components/biz/GroupPanel.vue'
import { GROUP_COUNTS, GROUP_FIXTURE, GROUP_STATES } from './fixtures'

/**
 * 分组面板样例 = 真 GroupPanel。
 * 面板自己的形态（展开 / 折叠 / 空分组 / 停用）各来一个；
 * 每个面板的箭头都能真的收放；「⋯ → 编辑」打开真 GroupDialog。
 * 有卡片的样子在卡片样例那一节（那里也是真面板 + 真卡进三列插槽）。
 */
const openMap = reactive<Record<string, boolean>>({ main: true })
for (const state of GROUP_STATES) openMap[state.key] = state.expanded

/** 面板的「编辑」→ 真 GroupDialog（与生产同一个组件） */
const editing = ref<{ name: string; description: string } | null>(null)
const dialogOpen = ref(false)

function openEdit(name: string, description: string): void {
  editing.value = { name, description }
  dialogOpen.value = true
}
</script>

<template>
  <div class="lab-parts">
    <div class="lab__h3">分组面板 · GroupPanel</div>
    <p class="lab__meta">
      面板负责摘要行（箭头、名称与简介、三列计数、启用开关、⋯ 菜单）和展开后的三列。
      卡片由页面通过插槽填进来；点箭头收放，⋯ 里的编辑打开真弹窗。
    </p>
    <GroupPanel
      :group="GROUP_FIXTURE"
      :counts="GROUP_COUNTS"
      :expanded="openMap.main ?? true"
      @toggle="openMap.main = !openMap.main"
      @edit="openEdit(GROUP_FIXTURE.name, GROUP_FIXTURE.description)"
      @delete="() => {}"
      @toggle-enabled="() => {}"
      @add="() => {}"
    />

    <div v-for="state in GROUP_STATES" :key="state.key" class="lab__gap-top">
      <div class="lab__h3">{{ state.caption }}</div>
      <GroupPanel
        :group="state.group"
        :counts="state.counts"
        :expanded="openMap[state.key] ?? state.expanded"
        @toggle="openMap[state.key] = !openMap[state.key]"
        @edit="openEdit(state.group.name, state.group.description)"
        @delete="() => {}"
        @toggle-enabled="() => {}"
        @add="() => {}"
      />
    </div>
  </div>

  <!-- 真 GroupDialog：面板的「编辑」打开它，默认关闭 -->
  <GroupDialog
    v-model="dialogOpen"
    :name="editing?.name ?? ''"
    :description="editing?.description ?? ''"
    @submit="dialogOpen = false"
    @cancel="dialogOpen = false"
  />
</template>
