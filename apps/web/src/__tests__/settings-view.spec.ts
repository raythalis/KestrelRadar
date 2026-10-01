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

  it('改一个数值：失焦才提交，且只提交改过的这一项', async () => {
    const wrapper = await mountLoaded('judge')
    const input = wrapper.get('[data-test="setting-scoreHighLine"] input')
    await input.setValue('70')
    expect(api.updateSettings).not.toHaveBeenCalled()

    await input.trigger('blur')
    await flushPromises()
    expect(api.updateSettings).toHaveBeenCalledWith({ scoreHighLine: 70 })
  })

  it('恢复默认按钮：跟出厂默认一样时是灰的，存过别的值才亮，点了调重置接口', async () => {
    const wrapper = await mountLoaded('judge')
    expect(wrapper.get('[data-test="restore-scoreHighLine"]').attributes('disabled')).toBeDefined()

    // 存过 80（接口回的就是 80）之后按钮该亮起来
    vi.mocked(api.fetchConfig).mockResolvedValue({
      ...snapshot,
      settings: { ...snapshot.settings, scoreHighLine: 80 },
    })
    const input = wrapper.get('[data-test="setting-scoreHighLine"] input')
    await input.setValue('80')
    await input.trigger('blur')
    await flushPromises()
    expect(api.updateSettings).toHaveBeenCalledWith({ scoreHighLine: 80 })
    expect(
      wrapper.get('[data-test="restore-scoreHighLine"]').attributes('disabled'),
    ).toBeUndefined()

    vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
    await wrapper.get('[data-test="restore-scoreHighLine"]').trigger('click')
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
