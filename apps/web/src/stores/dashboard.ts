import type { Incident, RecentEvent, StatsOverview } from '@kestrel/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  dismissIncident as dismissIncidentApi,
  fetchIncidents,
  fetchRecentEvents,
  fetchStatsOverview,
} from '@/api/dashboard'

/**
 * 仪表盘的数据：八张卡（stats）、最近事件、异常。
 * 三个接口各拉各的，任何一个挂了不影响另外两块先显示出来。
 */
export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<StatsOverview | null>(null)
  const events = ref<RecentEvent[]>([])
  const incidents = ref<Incident[]>([])
  const loading = ref(false)
  const errorMessage = ref('')

  const isEmpty = computed(
    () => events.value.length === 0 && incidents.value.length === 0 && !loading.value,
  )

  /** 忽视：成功就把那一行从列表里去掉（后端只改状态，库里留着） */
  async function dismiss(id: string): Promise<void> {
    await dismissIncidentApi(id)
    incidents.value = incidents.value.filter((incident) => incident.id !== id)
  }

  async function load(): Promise<void> {
    loading.value = true
    errorMessage.value = ''
    const results = await Promise.allSettled([
      fetchStatsOverview(),
      fetchRecentEvents(),
      fetchIncidents(),
    ])
    const [statsResult, eventsResult, incidentsResult] = results
    if (statsResult.status === 'fulfilled') stats.value = statsResult.value
    if (eventsResult.status === 'fulfilled') events.value = eventsResult.value
    if (incidentsResult.status === 'fulfilled') incidents.value = incidentsResult.value.incidents
    // 八张卡是最重要的那块：它没拿到才算整页失败
    if (statsResult.status === 'rejected') {
      errorMessage.value = (statsResult.reason as Error).message
    }
    loading.value = false
  }

  return { stats, events, incidents, loading, errorMessage, isEmpty, load, dismiss }
})
