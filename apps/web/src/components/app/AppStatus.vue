<!-- AppStatus：状态点/徽标。颜色只表达状态：ok / warn / err / info / neutral。
     V2 结构＝生产卡片已在用的 .k2-chip + .k2-chip__dot + .k2-t-* 语义色（与 MonitorCard 同构），
     不再使用被删除的 AppTag 那套 tag 观感。
     soft＝柔底胶囊（卡片上的运行状态用；默认就是它）；不带 soft 时是纯文字 + 点（背景透明）。
     busy 用于「测试中」（点会闪）；带 action 时可点。 -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tone?: 'ok' | 'warn' | 'err' | 'info' | 'neutral'
    busy?: boolean
    /** 可点：显示手型并带一点反馈（打点、试抓这类操作） */
    action?: boolean
    dot?: boolean
    /** 柔底：给卡片内的运行状态用 */
    soft?: boolean
  }>(),
  { tone: 'neutral', busy: false, action: false, dot: true, soft: false },
)

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const TONE_CLASS: Record<string, string> = {
  ok: 'k2-t-success',
  warn: 'k2-t-warning',
  err: 'k2-t-danger',
  info: 'k2-t-info',
  neutral: 'k2-t-neutral',
}

const toneClass = computed(() => TONE_CLASS[props.tone] ?? 'k2-t-neutral')
</script>

<template>
  <component
    :is="action ? 'button' : 'span'"
    :type="action ? 'button' : undefined"
    class="k2-chip"
    :class="[
      toneClass,
      soft ? 'k2-chip--soft' : 'k2-chip--plain',
      action ? 'k2-chip--action' : '',
      busy ? 'is-busy' : '',
    ]"
    data-test="app-status"
    @click="action ? emit('click', $event) : undefined"
  >
    <span v-if="dot" class="k2-chip__dot" />
    <slot />
  </component>
</template>
