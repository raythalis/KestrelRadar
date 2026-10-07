import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/api/config'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import ModelsView from '@/views/ModelsView.vue'

vi.mock('@/api/config')
// 卡片汇总只是卡片背面：不 mock 的话那次请求在 jsdom 里不落地，装载就永远等不齐
vi.mock('@/api/cardStats')

const provider = (id: string, name: string) => ({
  id,
  name,
  kind: 'openai_compatible' as const,
  baseUrl: `http://127.0.0.1:1${id.slice(1)}`,
  hasApiKey: false,
  enabled: true,
  sortOrder: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
})

const snapshot: ConfigSnapshot = {
  groups: [],
  discoveries: [],
  monitors: [],
  actions: [],
  channels: [],
  modelProviders: [provider('p1', '本机 Ollama'), provider('p2', '内网网关')],
  models: [],
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
  settings: { ...SETTINGS_DEFAULTS, judgeModelOrder: ['p1:qwen3:8b'] },
}

// 弹窗走真组件并 teleport 到 body：页面与弹窗都在 document 里，
// 这里统一用 DOMWrapper 从 document 取，VTU 的 trigger / classes / text 都照常用。
const dv = (test: string): DOMWrapper<Element> =>
  new DOMWrapper(document.querySelector(`[data-test="${test}"]`) as Element)
const dvAll = (test: string): DOMWrapper<Element>[] =>
  [...document.querySelectorAll(`[data-test="${test}"]`)].map((el) => new DOMWrapper(el))

function mountView() {
  return mount(ModelsView, {
    // 弹窗走真组件 + teleport：挂到 document body，别替身（替身后点击不会触达组件）
    attachTo: document.body,
    global: { plugins: [createPinia(), vuetify, i18n, appComponents] },
  })
}

async function mountLoaded(config: ConfigSnapshot = snapshot) {
  vi.mocked(api.fetchConfig).mockResolvedValue(config)
  const wrapper = mountView()
  // 两轮：装载里除了配置快照还要等卡片汇总那次请求落地，快照才写进 store
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('模型页', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [
      api.createProvider,
      api.updateProvider,
      api.removeProvider,
      api.updateSettings,
    ]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
    vi.mocked(api.fetchAvailableModels).mockReset()
    // 默认：两家都报模型；内网网关那家问不到（静默缺席）
    vi.mocked(api.fetchAvailableModels).mockImplementation(async (id: string) =>
      id === 'p1' ? ['qwen3:8b', 'llama3.3:70b'] : [],
    )
  })

  it('一个供应商都没有时：只给空态，不显示模型调用顺序', async () => {
    const wrapper = await mountLoaded({ ...snapshot, modelProviders: [] })

    expect(dv('models-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有供应商。')
    expect(document.querySelector('[data-test="model-order-card"]')).toBeNull()
  })

  it('供应商卡只有名称、类型与编辑 / 删除，没有开关', async () => {
    await mountLoaded()

    expect(dvAll('provider-card')).toHaveLength(2)
    expect(dvAll('provider-name').map((item) => item.text())).toEqual(['本机 Ollama', '内网网关'])
    expect(dvAll('provider-kind').map((item) => item.text())).toEqual([
      'OpenAI 兼容',
      'OpenAI 兼容',
    ])
    expect(document.querySelector('[data-test="provider-enabled"]')).toBeNull()
    expect(dv('provider-edit').exists()).toBe(true)
    expect(dv('provider-delete').exists()).toBe(true)
  })

  it('顺序下拉的选项来自各供应商现场报回来的模型，问不到的那家静默缺席', async () => {
    const wrapper = await mountLoaded()

    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items') as { title: string; value: string }[]
    expect(items.map((item) => item.title)).toEqual([
      '本机 Ollama:qwen3:8b',
      '本机 Ollama:llama3.3:70b',
    ])
    expect(items.map((item) => item.value)).toEqual(['p1:qwen3:8b', 'p1:llama3.3:70b'])
  })

  it('设置的顺序直接铺成行；保存时把空行去掉再写回设置', async () => {
    const wrapper = await mountLoaded()
    expect(dvAll('model-order-row')).toHaveLength(1)

    await dv('model-order-add').trigger('click')
    await flushPromises()
    expect(dvAll('model-order-row')).toHaveLength(2)

    await dv('model-order-save').trigger('click')
    await flushPromises()
    expect(api.updateSettings).toHaveBeenCalledWith({ judgeModelOrder: ['p1:qwen3:8b'] })
    expect(wrapper.emitted()).toBeTruthy()
  })

  it('删掉供应商：确认后调删除，顺序里引用它的行跟着消失并写回设置', async () => {
    await mountLoaded()

    await dvAll('provider-delete')[0]!.trigger('click')
    await flushPromises()
    await dv('confirm-ok').trigger('click')
    await flushPromises()

    expect(api.removeProvider).toHaveBeenCalledWith('p1')
    expect(api.updateSettings).toHaveBeenCalledWith({ judgeModelOrder: [] })
  })

  it('新建供应商：填名称与地址 → 调创建接口', async () => {
    await mountLoaded()

    await dv('new-provider').trigger('click')
    await flushPromises()
    await dv('provider-name-input').setValue('新的')
    await dv('provider-base-url-input').setValue('https://api.example.com')
    await dv('provider-save').trigger('click')
    await flushPromises()

    expect(api.createProvider).toHaveBeenCalledWith({
      name: '新的',
      kind: 'openai_compatible',
      baseUrl: 'https://api.example.com',
      enabled: true,
      sortOrder: 0,
    })
  })
})
