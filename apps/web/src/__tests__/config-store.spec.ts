import { SETTINGS_DEFAULTS, type ConfigSnapshot } from '@kestrel/contracts'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchConfig } from '@/api/config'
import { ApiError } from '@/api/http'
import { useConfigStore } from '@/stores/config'

vi.mock('@/api/config')

const snapshot: ConfigSnapshot = {
  groups: [
    {
      id: 'g1',
      name: 'AI',
      description: '',
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  discoveries: [],
  monitors: [],
  actions: [],
  channels: [],
  modelProviders: [],
  templates: [
    {
      id: 'builtin:default',
      name: '默认模板',
      nameKey: 'template.builtinDefault',
      content: '{{badge}}【{{group}}】{{title}}\n来源 {{sourceCount}} 个：\n{{sources}}\n{{url}}',
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 't1',
      name: '简短版',
      nameKey: null,
      content: '{{title}} — {{url}}',
      builtin: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  settings: SETTINGS_DEFAULTS,
}

describe('配置 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchConfig).mockReset()
  })

  it('拿到快照后统计各实体数量', async () => {
    vi.mocked(fetchConfig).mockResolvedValue(snapshot)
    const store = useConfigStore()

    await store.load()

    expect(store.counts).toEqual({
      groups: 1,
      discoveries: 0,
      monitors: 0,
      actions: 0,
      channels: 0,
    })
    expect(store.snapshot?.settings.concurrency).toBe(SETTINGS_DEFAULTS.concurrency)
    expect(store.errorMessage).toBe('')
  })

  it('后端连不上时给出提示，不抛异常', async () => {
    vi.mocked(fetchConfig).mockRejectedValue(new ApiError('network_error', '连不上后端（/api）'))
    const store = useConfigStore()

    await store.load()

    expect(store.errorMessage).toBe('连不上后端（/api）')
    expect(store.snapshot).toBeNull()
  })
})
