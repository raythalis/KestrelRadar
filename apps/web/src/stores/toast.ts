/**
 * Toast：一次性的操作反馈（接口失败、测试结论）。
 *
 * 口径（2026-10-06 定版）：
 * - 页面级错误条全部下线，凡是「刚才那一下成没成」都走这里；
 * - 成功类不提示（列表自己会变），只有失败与测试结论才提示；
 * - 不带操作按钮，只给结论，要动手请回到出问题的那个页面；
 * - 每条带倒计时条，到点自己消失，也能点 × 立刻关掉。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'success' | 'warning' | 'danger' | 'info'

export interface ToastItem {
  id: number
  tone: ToastTone
  text: string
  /** 自动消失的毫秒数 */
  duration: number
}

/** 停留时长：出错的留久一点，够看清也够点掉 */
const DURATION: Record<ToastTone, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  danger: 8000,
}

/** 同屏最多几条；再来新的就把最旧的挤掉 */
const MAX = 3
/** 同一句话这段时间内不重复弹（接口连着失败只提示一次） */
const DEDUPE_MS = 3000

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])
  let seq = 0
  let recent = new Map<string, number>()

  function dismiss(id: number): void {
    items.value = items.value.filter((item) => item.id !== id)
  }

  /** 提示一条；同样的文案刚弹过就跳过，返回 null */
  function push(text: string, tone: ToastTone = 'danger'): number | null {
    const message = text.trim()
    if (!message) return null

    const now = Date.now()
    if (recent.size > 20) {
      recent = new Map([...recent].filter(([, at]) => now - at < DEDUPE_MS))
    }
    const last = recent.get(message)
    if (last !== undefined && now - last < DEDUPE_MS) return null
    recent.set(message, now)

    const id = ++seq
    items.value = [...items.value, { id, tone, text: message, duration: DURATION[tone] }].slice(
      -MAX,
    )
    return id
  }

  function clear(): void {
    items.value = []
  }

  return { items, push, dismiss, clear }
})
