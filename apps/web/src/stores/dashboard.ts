import type {
  EventListQuery,
  EventSourceOption,
  Incident,
  RecentEvent,
  StatsOverview,
} from '@kestrel/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  dismissIncident as dismissIncidentApi,
  fetchEventSources,
  fetchIncidents,
  fetchRecentEvents,
  fetchStatsOverview,
  markEventRead,
} from '@/api/dashboard'

/**
 * 仪表盘的数据：八张卡（stats）、最近事件、异常。
 * 三个接口各拉各的，任何一个挂了不影响另外两块先显示出来。
 */
export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<StatsOverview | null>(null)
  const events = ref<RecentEvent[]>([])
  /** 下一页的游标；空表示 24h 窗口里就这些了 */
  const nextCursor = ref<string | null>(null)
  /** 正在取下一页（弹窗底部显示加载态） */
  const loadingMore = ref(false)
  /** 筛选浮层的来源清单（后端按窗口内计数给，多的排前面） */
  const sources = ref<EventSourceOption[]>([])
  /** 当前的来源筛选（来源 id）；空表示全部来源 */
  const filterId = ref<string | null>(null)
  const incidents = ref<Incident[]>([])
  const loading = ref(false)
  const errorMessage = ref('')

  const isEmpty = computed(
    () => events.value.length === 0 && incidents.value.length === 0 && !loading.value,
  )

  const hasMore = computed(() => nextCursor.value !== null)

  /** 列表查询参数：筛选走接口（后端按来源 id 过滤），前端不做本地筛选 */
  function listQuery(): EventListQuery {
    return filterId.value ? { discoveryId: filterId.value } : {}
  }

  /** 换筛选：从第一页重新取 */
  async function setFilter(discoveryId: string | null): Promise<void> {
    filterId.value = discoveryId
    const page = await fetchRecentEvents(listQuery())
    events.value = page.events
    nextCursor.value = page.nextCursor
  }

  /** 滚到底再要一页：按 id 去重（翻页途中来了新事件也不会重复） */
  async function loadMore(): Promise<void> {
    if (loadingMore.value || !nextCursor.value) return
    loadingMore.value = true
    try {
      const page = await fetchRecentEvents({ ...listQuery(), cursor: nextCursor.value })
      const seen = new Set(events.value.map((event) => event.id))
      events.value = [...events.value, ...page.events.filter((event) => !seen.has(event.id))]
      nextCursor.value = page.nextCursor
    } finally {
      loadingMore.value = false
    }
  }

  /** 点开一条：后端记已读（幂等），本地把那一行就地改成已读 */
  async function markRead(id: string): Promise<void> {
    const result = await markEventRead(id)
    events.value = events.value.map((event) =>
      event.id === id ? { ...event, readAt: result.readAt } : event,
    )
  }

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
      fetchRecentEvents(listQuery()),
      fetchIncidents(),
      fetchEventSources(),
    ])
    const [statsResult, eventsResult, incidentsResult, sourcesResult] = results
    if (statsResult.status === 'fulfilled') stats.value = statsResult.value
    if (eventsResult.status === 'fulfilled') {
      events.value = eventsResult.value.events
      nextCursor.value = eventsResult.value.nextCursor
    }
    if (incidentsResult.status === 'fulfilled') incidents.value = incidentsResult.value.incidents
    if (sourcesResult.status === 'fulfilled') sources.value = sourcesResult.value
    // 八张卡是最重要的那块：它没拿到才算整页失败
    if (statsResult.status === 'rejected') {
      errorMessage.value = (statsResult.reason as Error).message
    }
    loading.value = false
  }

  return {
    stats,
    events,
    incidents,
    sources,
    loading,
    loadingMore,
    hasMore,
    errorMessage,
    isEmpty,
    load,
    loadMore,
    setFilter,
    markRead,
    dismiss,
  }
})
