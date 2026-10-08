<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  high: number
  low: number
}>()

const emit = defineEmits<{
  (e: 'update:high', value: number): void
  (e: 'update:low', value: number): void
}>()

const { t } = useI18n()
const track = ref<HTMLElement | null>(null)

/** 两条分线之间至少留 5 分，避免拖成一条 */
const GAP = 5

function pct(value: number): string {
  return `${Math.min(100, Math.max(0, value))}%`
}

function clampLow(value: number): number {
  return Math.min(Math.max(0, Math.round(value)), props.high - GAP)
}

function clampHigh(value: number): number {
  return Math.max(Math.min(Math.round(value), 100), props.low + GAP)
}

function fromEvent(event: PointerEvent): number {
  const box = track.value?.getBoundingClientRect()
  if (!box) return 0
  return ((event.clientX - box.left) / box.width) * 100
}

function startDrag(which: 'low' | 'high', event: PointerEvent): void {
  event.preventDefault()
  const move = (moveEvent: PointerEvent) => {
    const value = fromEvent(moveEvent)
    if (which === 'low') emit('update:low', clampLow(value))
    else emit('update:high', clampHigh(value))
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
}

/** 键盘也能调：左右各 1 分，按住 Shift 走 5 分 */
function nudge(which: 'low' | 'high', event: KeyboardEvent): void {
  const step = event.shiftKey ? 5 : 1
  const delta =
    event.key === 'ArrowLeft' || event.key === 'ArrowDown'
      ? -step
      : event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? step
        : 0
  if (delta === 0) return
  event.preventDefault()
  if (which === 'low') emit('update:low', clampLow(props.low + delta))
  else emit('update:high', clampHigh(props.high + delta))
}
</script>

<template>
  <div class="k2-band" data-test="setting-scoreBands">
    <div ref="track" class="k2-band__track" role="group" :aria-label="t('settings.band.aria')">
      <div class="k2-band__zone k2-band__zone--drop" :style="{ inlineSize: pct(low) }" />
      <div
        class="k2-band__zone k2-band__zone--gray"
        :style="{ insetInlineStart: pct(low), inlineSize: pct(high - low) }"
      />
      <div
        class="k2-band__zone k2-band__zone--hit"
        :style="{ insetInlineStart: pct(high), inlineSize: pct(100 - high) }"
      />

      <button
        type="button"
        role="slider"
        class="k2-band__handle"
        :data-test="`setting-lowLine`"
        :aria-valuenow="low"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('settings.band.lowAria')"
        :style="{ insetInlineStart: pct(low) }"
        @pointerdown="startDrag('low', $event)"
        @keydown="nudge('low', $event)"
      >
        <span class="k2-band__grip" />
      </button>

      <button
        type="button"
        role="slider"
        class="k2-band__handle"
        :data-test="`setting-highLine`"
        :aria-valuenow="high"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('settings.band.highAria')"
        :style="{ insetInlineStart: pct(high) }"
        @pointerdown="startDrag('high', $event)"
        @keydown="nudge('high', $event)"
      >
        <span class="k2-band__grip" />
      </button>
    </div>

    <ul class="k2-band__legend">
      <li class="k2-band__legenditem k2-band__legenditem--drop">
        <span class="k2-band__swatch" />
        <span>{{ t('settings.band.drop', { value: low }) }}</span>
      </li>
      <li class="k2-band__legenditem k2-band__legenditem--gray">
        <span class="k2-band__swatch" />
        <span>{{ t('settings.band.gray', { low, high }) }}</span>
      </li>
      <li class="k2-band__legenditem k2-band__legenditem--hit">
        <span class="k2-band__swatch" />
        <span>{{ t('settings.band.hit', { value: high }) }}</span>
      </li>
    </ul>
  </div>
</template>
