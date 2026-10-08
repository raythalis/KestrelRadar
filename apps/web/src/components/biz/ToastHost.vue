<!-- ToastHost：浮层提示（桌面右下角，窄屏贴底）。挂在 AppShell 根部，页面只管往 store 里 push。
     每条自带倒计时条：鼠标悬停时暂停（时间也冻住），移开继续；也能点 × 立刻关掉。
     不带操作按钮——要动手请回到出问题的那个页面。
     只消费 v2 零件（.k2-toast / .k2-t-* / .k2-iconbtn 的图标按钮样式）。 -->
<script setup lang="ts">
import { onBeforeUnmount, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useToastStore, type ToastItem, type ToastTone } from '@/stores/toast'

const store = useToastStore()
const { t } = useI18n()

const ICONS: Record<ToastTone, string> = {
  success: 'mdi-check-circle-outline',
  warning: 'mdi-alert-outline',
  danger: 'mdi-alert-circle-outline',
  info: 'mdi-information-outline',
}

/** 每条自己的倒计时：悬停时把剩余时间冻住，移开接着走 */
interface Timer {
  handle: number
  remaining: number
  startedAt: number
}
const timers = reactive<Record<number, Timer>>({})

function clearTimer(id: number): void {
  const timer = timers[id]
  if (timer) window.clearTimeout(timer.handle)
  delete timers[id]
}

function arm(id: number, remaining: number): void {
  clearTimer(id)
  timers[id] = {
    handle: window.setTimeout(() => store.dismiss(id), remaining),
    remaining,
    startedAt: Date.now(),
  }
}

function pause(id: number): void {
  const timer = timers[id]
  if (!timer) return
  window.clearTimeout(timer.handle)
  timers[id] = {
    handle: 0,
    remaining: Math.max(0, timer.remaining - (Date.now() - timer.startedAt)),
    startedAt: Date.now(),
  }
}

function resume(item: ToastItem): void {
  const timer = timers[item.id]
  const remaining = timer ? timer.remaining : item.duration
  if (remaining <= 0) {
    store.dismiss(item.id)
    return
  }
  arm(item.id, remaining)
}

/** 新来的开始计时；被挤掉或被关掉的把计时器一起收走 */
watch(
  () => store.items.map((item) => item.id),
  (ids) => {
    for (const item of store.items) {
      if (!timers[item.id]) arm(item.id, item.duration)
    }
    for (const id of Object.keys(timers).map(Number)) {
      if (!ids.includes(id)) clearTimer(id)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  for (const id of Object.keys(timers).map(Number)) clearTimer(id)
})
</script>

<template>
  <TransitionGroup
    tag="div"
    name="k2-toast"
    class="k2-toasts"
    aria-live="polite"
    data-test="toast-host"
  >
    <div
      v-for="item in store.items"
      :key="item.id"
      class="k2-toast"
      :class="`k2-t-${item.tone}`"
      :role="item.tone === 'danger' ? 'alert' : 'status'"
      data-test="toast"
      @mouseenter="pause(item.id)"
      @mouseleave="resume(item)"
    >
      <i class="mdi k2-toast__icon" :class="ICONS[item.tone]" />
      <span class="k2-toast__text" data-test="toast-text">{{ item.text }}</span>
      <button
        type="button"
        class="k2-toast__close"
        :aria-label="t('common.close')"
        data-test="toast-close"
        @click="store.dismiss(item.id)"
      >
        <i class="mdi mdi-close" />
      </button>
      <span class="k2-toast__bar" :style="{ animationDuration: `${item.duration}ms` }" />
    </div>
  </TransitionGroup>
</template>
