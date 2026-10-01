import { flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/api/config'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import ModelsView from '@/views/ModelsView.vue'

vi.mock('@/api/config')

const snapshot: ConfigSnapshot = {
  groups: [],
  discoveries: [],
  monitors: [],
  actions: [],
  channels: [],
  modelProviders: [
    {
      id: 'p1',
      name: '本地 Ollama',
      kind: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      hasApiKey: false,
      enabled: true,
      sortOrder: 0,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  models: [
    {
      id: 'm1',
      providerId: 'p1',
      modelName: 'qwen2.5:7b',
      enabled: true,
      sortOrder: 0,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  templates: [
    {
      id: 'builtin:default',
      name: '默认模板',
      nameKey: 'template.builtinDefault',
      content: '{{title}}',
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
  ],
  settings: SETTINGS_DEFAULTS,
}

function mountView() {
  return mount(ModelsView, {
    global: {
      plugins: [createPinia(), vuetify, i18n],
      stubs: { 'v-dialog': { template: '<div data-test="dialog-stub"><slot /></div>' } },
    },
  })
}

async function mountLoaded() {
  vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
  const wrapper = mountView()
  await flushPromises()
  return wrapper
}

describe('模型页', () => {
  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [
      api.createProvider,
      api.updateProvider,
      api.removeProvider,
      api.createModel,
      api.updateModel,
      api.removeModel,
    ]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
  })

  it('列出供应商与它下面的模型', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.findAll('[data-test="provider-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="provider-name"]').text()).toBe('本地 Ollama')
    expect(wrapper.get('[data-test="provider-kind"]').text()).toBe('Ollama')
    expect(wrapper.get('[data-test="provider-base-url"]').text()).toContain('11434')
    expect(wrapper.get('[data-test="model-name"]').text()).toBe('qwen2.5:7b')
  })

  it('加一个模型名：调创建接口', async () => {
    vi.mocked(api.createModel).mockResolvedValue(snapshot.models[0]!)
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="model-draft-p1"] input').setValue('llama3:8b')
    await wrapper.get('[data-test="model-add"]').trigger('click')
    await flushPromises()

    expect(api.createModel).toHaveBeenCalledWith('p1', {
      modelName: 'llama3:8b',
      enabled: true,
      sortOrder: 0,
    })
  })

  it('停用开关写回后端', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="model-enabled-m1"] input').setValue(false)
    await flushPromises()
    expect(api.updateModel).toHaveBeenCalledWith('m1', { enabled: false })
  })

  it('删除模型直接调接口；删除供应商要确认', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="model-delete"]').trigger('click')
    await flushPromises()
    expect(api.removeModel).toHaveBeenCalledWith('m1')

    await wrapper.get('[data-test="provider-delete"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('它下面的模型清单会一起删掉')
    await wrapper.get('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeProvider).toHaveBeenCalledWith('p1')
  })

  it('新建供应商：填名称与地址 → 调创建接口', async () => {
    vi.mocked(api.createProvider).mockResolvedValue(snapshot.modelProviders[0]!)
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="new-provider"]').trigger('click')
    const dialog = wrapper.get('[data-test="provider-dialog"]')
    await dialog.get('[data-test="provider-name-input"] input').setValue('远端')
    await dialog
      .get('[data-test="provider-base-url-input"] input')
      .setValue('http://192.168.5.9:11434')
    await dialog.get('[data-test="provider-api-key-input"] input').setValue('sk-x')
    await flushPromises()
    await dialog.get('[data-test="provider-save"]').trigger('click')
    await flushPromises()

    expect(api.createProvider).toHaveBeenCalledWith({
      name: '远端',
      kind: 'openai_compatible',
      baseUrl: 'http://192.168.5.9:11434',
      apiKey: 'sk-x',
      enabled: true,
      sortOrder: 0,
    })
  })
})
