import type { CardStat } from '@kestrel/contracts'
import { computed, type Ref } from 'vue'

/**
 * 卡片背面的三件套：成功率（抓取 / 筛选 / 投递）、最近 N 天的迷你柱、窗口内的计数。
 * 口径：发现卡＝抓到条数、监听卡＝命中条数、动作卡＝投递次数；窗口内没有记录时显示「—」，不编 0。
 */
export function cardStatView(stat: Ref<CardStat | null>, windowDays: Ref<number>) {
  const days = computed(() => windowDays.value)
  const hasRate = computed(() => typeof stat.value?.rate === 'number')
  /** 百分数只保留一位小数，跟仪表盘一致 */
  const rateText = computed(() => {
    const rate = stat.value?.rate
    if (typeof rate !== 'number') return '—'
    return String(Math.round(rate * 1000) / 10)
  })
  /** 没有记录时也画满窗口：柱子全是下限高度，看着是一条平的淡线，不是空一块 */
  const bars = computed(() => {
    const daily = stat.value?.daily
    if (daily && daily.length > 0) return daily
    return Array.from({ length: days.value }, () => 0)
  })
  const barHeights = computed(() => {
    const values = bars.value
    const peak = Math.max(1, ...values)
    return values.map((value) => Math.max(Math.round((value / peak) * 22), 3))
  })
  const total = computed(() => stat.value?.total ?? 0)
  return { hasRate, rateText, bars, barHeights, total, days }
}
