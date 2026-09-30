import type { ConfigSnapshot } from '@kestrel/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { fetchConfig } from '@/api/config'
import { ApiError } from '@/api/http'

export const useConfigStore = defineStore('config', () => {
  const snapshot = ref<ConfigSnapshot | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')

  const counts = computed(() => ({
    groups: snapshot.value?.groups.length ?? 0,
    discoveries: snapshot.value?.discoveries.length ?? 0,
    monitors: snapshot.value?.monitors.length ?? 0,
    actions: snapshot.value?.actions.length ?? 0,
    channels: snapshot.value?.channels.length ?? 0,
  }))

  async function load() {
    loading.value = true
    errorMessage.value = ''
    try {
      snapshot.value = await fetchConfig()
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : '读取配置失败'
    } finally {
      loading.value = false
    }
  }

  return { snapshot, loading, errorMessage, counts, load }
})
