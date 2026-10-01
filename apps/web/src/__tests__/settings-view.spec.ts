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
  settings: { ...SETTINGS_DEFAULTS, scoreHighLine: 65 },
}

function mountView() {
  return mount(SettingsView, {
    global: {
      plugins: [createPinia(), vuetify, i18n],
      stubs: { 'v-dialog': { template: '<div data-test="dialog-stub"><slot /></div>' } },
    },
  })
}

async function mountLoaded(tab = 'general') {
  vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
  const wrapper = mountView()
  await flushPromises()
  await wrapper.get(`[data-test="tab-${tab}"]`).trigger('click')
  await flushPromises()
  return wrapper
}

describe('设置页', () => {
  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [api.updateSettings, api.resetSetting]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(snapshot.settings as never)
    }
    for (const fn of [api.createTemplate, api.updateTemplate, api.removeTemplate]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
  })

  it('二级 tab 都在，切到哪个就显示哪一组设置', async () => {
    const wrapper = await mountLoaded('general')
    for (const tab of ['general', 'judge', 'collection', 'delivery', 'source', 'templates']) {
      expect(wrapper.find(`[data-test="tab-${tab}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('[data-test="pane-general"]').exists()).toBe(true)

    await wrapper.get('[data-test="tab-judge"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="pane-judge"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pane-general"]').exists()).toBe(false)
    // 判定页的字段是真渲染出来的
    expect(wrapper.find('[data-test="setting-judgeMode"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="setting-scoreHighLine"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="setting-globalExcludeKeywords"]').exists()).toBe(true)
  })

  it('改一个数值：不会自动提交，点这张卡的保存才写回，且只提交改过的项', async () => {
    const wrapper = await mountLoaded('judge')
    const input = wrapper.get('[data-test="setting-scoreHighLine"] input')
    await input.setValue('70')
    await flushPromises()
    expect(api.updateSettings).not.toHaveBeenCalled()

    await wrapper.get('[data-test="save-judgeBands"]').trigger('click')
    await flushPromises()
    expect(api.updateSettings).toHaveBeenCalledWith({ scoreHighLine: 70 })
  })

  it('保存按钮：没改动时是灰的，改过才亮', async () => {
    const wrapper = await mountLoaded('judge')
    expect(wrapper.get('[data-test="save-judgeBands"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="setting-scoreHighLine"] input').setValue('70')
    await flushPromises()
    expect(wrapper.get('[data-test="save-judgeBands"]').attributes('disabled')).toBeUndefined()
  })

  it('恢复默认：整张卡一起回默认，跟出厂一样时按钮是灰的', async () => {
    const wrapper = await mountLoaded('judge')
    expect(wrapper.get('[data-test="restore-judgeBands"]').attributes('disabled')).toBeDefined()

    // 库里存着 80（跟默认 65 不一样）→ 恢复默认亮起来
    vi.mocked(api.fetchConfig).mockResolvedValue({
      ...snapshot,
      settings: { ...snapshot.settings, scoreHighLine: 80 },
    })
    await wrapper.get('[data-test="setting-scoreHighLine"] input').setValue('80')
    await wrapper.get('[data-test="save-judgeBands"]').trigger('click')
    await flushPromises()
    expect(api.updateSettings).toHaveBeenCalledWith({ scoreHighLine: 80 })

    vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
    await wrapper.get('[data-test="restore-judgeBands"]').trigger('click')
    await flushPromises()
    expect(api.resetSetting).toHaveBeenCalledWith('scoreHighLine')
  })

  it('模板页：内置的只读、自定义的能改能删', async () => {
    const wrapper = await mountLoaded('templates')
    const cards = wrapper.findAll('[data-test="template-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.get('[data-test="template-name"]').text()).toBe('默认模板')
    expect(cards[0]!.find('[data-test="template-builtin"]').exists()).toBe(true)
    expect(cards[0]!.find('[data-test="template-edit"]').exists()).toBe(false)
    expect(cards[1]!.find('[data-test="template-delete"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="template-builtin"]')).toHaveLength(1)
  })

  it('模板页：新建自定义模板', async () => {
    vi.mocked(api.createTemplate).mockResolvedValue(snapshot.templates[1]!)
    const wrapper = await mountLoaded('templates')

    await wrapper.get('[data-test="new-template"]').trigger('click')
    const dialog = wrapper.get('[data-test="template-dialog"]')
    await dialog.get('[data-test="template-name-input"] input').setValue('夜报版')
    await dialog.get('[data-test="template-content-input"] textarea').setValue('{{title}}')
    await dialog.get('[data-test="template-save"]').trigger('click')
    await flushPromises()

    expect(api.createTemplate).toHaveBeenCalledWith({ name: '夜报版', content: '{{title}}' })
  })

  it('模板页：删除自定义模板要确认，文案写明回落到默认模板', async () => {
    const wrapper = await mountLoaded('templates')
    await wrapper.get('[data-test="template-delete"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('回落到默认模板')

    await wrapper.get('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeTemplate).toHaveBeenCalledWith('t1')
  })
})
