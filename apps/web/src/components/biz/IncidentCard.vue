<!-- IncidentCard：异常记录的一张。
     只放已有可信字段：对象名、错误原文、首次出现、最近发生。
     不做「持续多久」这类派生字段，也不放「立即检查」这类动作按钮（按需求不引入）。
     头部右侧的 × 是「忽视」：只改状态、不删记录，由调用方落库。
     配色：异常一律走危险色（红）——采集 / 判定 / 推送都一样，不按类别分色。 -->
<script setup lang="ts">
import type { Incident } from '@kestrel/contracts'

import { SEMANTIC_ICONS } from '@/components/biz/icons'

defineProps<{
  incident: Incident
  /** 首次出现（已格式化） */
  firstSeen?: string
  /** 最近发生（已格式化） */
  lastSeen?: string
  /** 忽视按钮的无障碍名字 */
  dismissLabel?: string
}>()
const emit = defineEmits<{ dismiss: [incident: Incident] }>()
</script>

<template>
  <article class="k2-card k2-card--sm k2-incident k2-t-danger" data-test="incident-row">
    <div class="k2-card__head">
      <span class="k2-tile k2-tile--sm">
        <v-icon size="20">{{ SEMANTIC_ICONS.incident }}</v-icon>
      </span>
      <span class="k2-card__heading">
        <span class="k2-row__title">{{ incident.targetName }}</span>
      </span>
      <button
        type="button"
        class="k2-iconbtn k2-iconbtn--danger-hover"
        :aria-label="dismissLabel"
        :title="dismissLabel"
        data-test="incident-dismiss"
        @click="emit('dismiss', incident)"
      >
        <v-icon size="20">mdi-close</v-icon>
      </button>
    </div>
    <p class="k2-card__message">{{ incident.message }}</p>
    <div class="k2-incident__foot" data-test="incident-foot">
      <span v-if="firstSeen" data-test="incident-first-seen">{{ firstSeen }}</span>
      <span v-if="lastSeen" data-test="incident-last-seen">{{ lastSeen }}</span>
    </div>
  </article>
</template>
