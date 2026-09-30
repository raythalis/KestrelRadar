import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { fetchWorkspace } from '@/api/workspace'
import { sampleWorkspace } from '@/constants/sample-workspace'
import type { AnyCard, Group, Workspace } from '@/types/domain'

export type WorkspaceDataSource = 'sample' | 'api'

function cloneWorkspace(source: Workspace): Workspace {
  return structuredClone(source)
}

/** 统计一个分组里三类卡片各有多少张 —— 纯函数，便于单测 */
export function countCards(cards: AnyCard[]) {
  return {
    source: cards.filter((card) => card.kind === 'source').length,
    watcher: cards.filter((card) => card.kind === 'watcher').length,
    action: cards.filter((card) => card.kind === 'action').length,
  }
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const data = ref<Workspace>(cloneWorkspace(sampleWorkspace))
  const dataSource = ref<WorkspaceDataSource>('sample')
  const loading = ref(false)
  const lastError = ref<string>('')

  const groups = computed<Group[]>(() => data.value.groups)
  const enabledGroups = computed(() => groups.value.filter((group) => group.enabled))

  const summary = computed(() => {
    const cards = groups.value.flatMap((group) => group.cards)
    const counts = countCards(cards)
    return {
      groups: groups.value.length,
      sources: counts.source,
      watchers: counts.watcher,
      actions: counts.action,
    }
  })

  /** 尝试从后端读取；失败则保留示例数据并记录原因（不伪造后端可用） */
  async function load(): Promise<WorkspaceDataSource> {
    loading.value = true
    lastError.value = ''
    try {
      data.value = await fetchWorkspace()
      dataSource.value = 'api'
    } catch (error) {
      data.value = cloneWorkspace(sampleWorkspace)
      dataSource.value = 'sample'
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
    return dataSource.value
  }

  function resetToSample() {
    data.value = cloneWorkspace(sampleWorkspace)
    dataSource.value = 'sample'
    lastError.value = ''
  }

  return {
    data,
    dataSource,
    loading,
    lastError,
    groups,
    enabledGroups,
    summary,
    load,
    resetToSample,
  }
})
