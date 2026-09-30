import { flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/api/config'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import SettingsView from '@/views/SettingsView.vue'

vi.mock('@/api/config')

const snapshot: ConfigSnapshot = {
  groups: [],
  discoveries: [],
  monitors: [],
  actions: [],
  channels: [],
  modelProviders: [],
  models: [],
  templates: [
    {
      id: 'builtin:zh',
      name: '系统内置 · 中文',
      content: '{{badge}}【{{group}}】{{title}}\n来源 {{sourceCount}} 个：\n{{sources}}\n{{url}}',
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 'builtin:en',
      name: 'Built-in · English',
      content: '{{badge}}[{{group}}] {{title}}',
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 't1',
      name: '简短版',
      content: '{{title}} — {{url}}',
      builtin: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  settings: SETTINGS_DEFAULTS,
}

function mountView() {
  return mount(SettingsView, {
    global: {
      plugins: [createPinia(), vuetify, i18n],
      stubs: {
        'v-dialog': { template: '<div data-test="dialog-stub"><slot /></div>' },
      },
    },
  })
}

async function mountLoaded() {
  vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
  const wrapper = mountView()
  await flushPromises()
  return wrapper
}

describe('设置页 · 消息模板', () => {
  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [api.createTemplate, api.updateTemplate, api.removeTemplate]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
  })

  it('列出内置与自定义模板，内置的标出来且没有改删入口', async () => {
    const wrapper = await mountLoaded()
    const cards = wrapper.findAll('[data-test="template-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[2]!.get('[data-test="template-name"]').text()).toBe('简短版')

    const builtin = wrapper.findAll('[data-test="template-builtin"]')
    expect(builtin).toHaveLength(2)
    // 内置模板卡片上没有编辑 / 删除
    expect(cards[0]!.find('[data-test="template-edit"]').exists()).toBe(false)
    expect(cards[1]!.find('[data-test="template-delete"]').exists()).toBe(false)
    expect(cards[2]!.find('[data-test="template-delete"]').exists()).toBe(true)
  })

  it('展开的内容框里能看到模板正文', async () => {
    const wrapper = await mountLoaded()
    const preview = wrapper.findAll('[data-test="template-content"]')[0]!
    expect(preview.text()).toContain('{{sourceCount}}')
  })

  it('新建模板：填别名与内容 → 调接口', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
    vi.mocked(api.createTemplate).mockResolvedValue(snapshot.templates[2]!)
    const wrapper = await mountLoaded()

    await wrapper.find('[data-test="new-template"]').trigger('click')
    const dialog = wrapper.find('[data-test="template-dialog"]')
    await dialog.find('[data-test="template-name-input"] input').setValue('夜报版')
    await dialog.find('[data-test="template-content-input"] textarea').setValue('{{title}}')
    await dialog.find('[data-test="template-save"]').trigger('click')
    await flushPromises()

    expect(api.createTemplate).toHaveBeenCalledWith({ name: '夜报版', content: '{{title}}' })
  })

  it('编辑自定义模板：走 PATCH', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
    vi.mocked(api.updateTemplate).mockResolvedValue(snapshot.templates[2]!)
    const wrapper = await mountLoaded()

    await wrapper.findAll('[data-test="template-edit"]')[0]!.trigger('click')
    const dialog = wrapper.find('[data-test="template-dialog"]')
    const nameInput = dialog.find('[data-test="template-name-input"] input')
      .element as HTMLInputElement
    expect(nameInput.value).toBe('简短版')
    await dialog.find('[data-test="template-content-input"] textarea').setValue('{{title}} 更新版')
    await dialog.find('[data-test="template-save"]').trigger('click')
    await flushPromises()

    expect(api.updateTemplate).toHaveBeenCalledWith('t1', {
      name: '简短版',
      content: '{{title}} 更新版',
    })
  })

  it('删除自定义模板：先确认，文案写明回落到内置', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
    const wrapper = await mountLoaded()

    await wrapper.findAll('[data-test="template-delete"]')[0]!.trigger('click')
    expect(wrapper.text()).toContain('回落到系统内置模板')
    expect(api.removeTemplate).not.toHaveBeenCalled()

    await wrapper.find('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeTemplate).toHaveBeenCalledWith('t1')
  })
})
