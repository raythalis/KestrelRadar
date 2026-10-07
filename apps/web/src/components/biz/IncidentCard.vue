<!-- IncidentCard：异常记录的一张。
     只放已有可信字段：对象名、分组、错误原因、最近发生时间。
     原因以调用方传进来的 reason 为准（那已经是当前语言的文案）；没给才退回记录里的原文——
     也就是认不出的码、老数据、暂时没翻译这三种情况。
     detail 是语言无关的副信息（超时秒数、HTTP 状态码、对方的原始说法），只在有值时占一行。
     卡底那一行只留最近发生时间，用时钟图标 + 时间本身表示，不写「首次出现 / 最近发生」这类字。
     不做「持续多久」这类派生字段，也不放「立即检查」这类动作按钮（按需求不引入）。
     头部右侧的 × 是「忽视」：只改状态、不删记录，由调用方落库。
     配色：异常一律走危险色（红）——采集 / 判定 / 推送都一样，不按类别分色。 -->
<script setup lang="ts">
import type { Incident } from '@kestrel/contracts'

import { SEMANTIC_ICONS } from '@/components/biz/icons'

defineProps<{
  incident: Incident
  /** 原因文案（页面按 code 翻好的当前语言文案）；不给就退回记录里的原文 */
  reason?: string
  /** 语言无关的副信息（30s / HTTP 503 / Unauthorized）；不给就不占位 */
  detail?: string
  /** 最近发生（页面已经格式化好的样子）；不传就不占位 */
  lastSeen?: string
  /** 忽视按钮的无障碍名字 */
  dismissLabel?: string
  /** 第二行副标题（调用方拼好的「分组：xxx」）；不给就不占位 */
  groupLabel?: string
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
        <span v-if="groupLabel" class="k2-card__sub" data-test="incident-group">{{
          groupLabel
        }}</span>
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
    <p class="k2-card__message">{{ reason || incident.message }}</p>
    <p v-if="detail" class="k2-incident__detail" data-test="incident-detail">{{ detail }}</p>
    <div class="k2-incident__foot" data-test="incident-foot">
      <span v-if="lastSeen" class="k2-row__time" data-test="incident-last-seen">
        <v-icon size="13">mdi-clock-outline</v-icon>
        <span>{{ lastSeen }}</span>
      </span>
    </div>
  </article>
</template>
