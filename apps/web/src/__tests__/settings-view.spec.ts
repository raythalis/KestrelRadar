import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as cardStatsApi from '@/api/cardStats'
import * as api from '@/api/config'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import SettingsView from '@/views/SettingsView.vue'

vi.mock('@/api/config')
vi.mock('@/api/cardStats')

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

// 弹窗走真组件并 teleport 到 body：页面与弹窗都在 document 里，
// 这里统一用 DOMWrapper 从 document 取，VTU 的 trigger / classes / text 都照常用。
const dv = (test: string): DOMWrapper<Element> =>
  new DOMWrapper(document.querySelector(`[data-test="${test}"]`) as Element)
const dvAll = (test: string): DOMWrapper<Element>[] =>
  [...document.querySelectorAll(`[data-test="${test}"]`)].map((el) => new DOMWrapper(el))

function mountView() {
  return mount(SettingsView, {
    // 弹窗走真组件 + teleport：挂到 document body，别替身（替身后点击不会触达组件）
    attachTo: document.body,
    global: { plugins: [createPinia(), vuetify, i18n] },
  })
}

async function mountLoaded(tab = 'general', snap: ConfigSnapshot = snapshot) {
  vi.mocked(api.fetchConfig).mockResolvedValue(snap)
  const wrapper = mountView()
  await flushPromises()
  await wrapper.get(`[data-test="tab-${tab}"]`).trigger('click')
  await flushPromises()
  return wrapper
}

describe('设置页', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    vi.mocked(cardStatsApi.fetchCardStats).mockReset()
    vi.mocked(cardStatsApi.fetchCardStats).mockResolvedValue({
      windowDays: 7,
      discoveries: {},
      monitors: {},
      actions: {},
    })
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
    for (const tab of ['general', 'judge', 'collection', 'delivery']) {
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

  it('改一个数值：点保存才写回，且只提交改过的那项', async () => {
    const wrapper = await mountLoaded('judge')
    // 没改动时保存不可用
    expect(wrapper.get('[data-test="card-save-judgeRules"]').attributes('disabled')).toBeDefined()

    const low = wrapper.findAll('[data-test="setting-scoreHighLine"] .k2-band__handle')[0]!
    await low.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(api.updateSettings).not.toHaveBeenCalled()

    await wrapper.get('[data-test="card-save-judgeRules"]').trigger('click')
    await flushPromises()
    expect(api.updateSettings).toHaveBeenCalledWith({ scoreLowLine: 36 })
  })

  it('保存前校验：数值越界就不发请求，错误显示在该字段下面', async () => {
    const wrapper = await mountLoaded('collection')
    await wrapper.get('[data-test="setting-concurrency"]').setValue('99')
    await flushPromises()
    await wrapper.get('[data-test="card-save-collect"]').trigger('click')
    await flushPromises()

    expect(api.updateSettings).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="error-concurrency"]').text()).toContain('20')
  })

  it('重置：丢掉没保存的改动，回到上一次保存的值，不发请求也不弹窗', async () => {
    const wrapper = await mountLoaded('collection', {
      ...snapshot,
      settings: { ...SETTINGS_DEFAULTS, concurrency: 9 },
    })
    // 没改动时是灰的
    expect(wrapper.get('[data-test="card-reset-collect"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="setting-concurrency"]').setValue('12')
    await flushPromises()
    expect(wrapper.get('[data-test="card-reset-collect"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-test="card-reset-collect"]').trigger('click')
    await flushPromises()

    const input = wrapper.get('[data-test="setting-concurrency"]').element as HTMLInputElement
    expect(input.value).toBe('9')
    expect(api.updateSettings).not.toHaveBeenCalled()
    expect(api.resetSetting).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="confirm-dialog"]').exists()).toBe(false)
  })

  it('数值框：等于默认值就留空，默认值走 placeholder，清空即回到默认', async () => {
    const wrapper = await mountLoaded('collection')
    const input = wrapper.get('[data-test="setting-concurrency"]').element as HTMLInputElement
    expect(input.value).toBe('')
    expect(input.placeholder).toBe('5')

    // 填了一个自定义值就显示出来
    await wrapper.get('[data-test="setting-concurrency"]').setValue('8')
    expect(
      (wrapper.get('[data-test="setting-concurrency"]').element as HTMLInputElement).value,
    ).toBe('8')

    // 清空＝回到默认值，输入框又回到留空状态
    await wrapper.get('[data-test="setting-concurrency"]').setValue('')
    const after = wrapper.get('[data-test="setting-concurrency"]').element as HTMLInputElement
    expect(after.value).toBe('')
    expect(api.updateSettings).not.toHaveBeenCalled()
  })

  it('分档条：两条线都能调，低线不会顶到高线上去', async () => {
    const wrapper = await mountLoaded('judge')
    const handles = wrapper.findAll('[data-test="setting-scoreHighLine"] .k2-band__handle')
    expect(handles).toHaveLength(2)
    expect(handles[0]!.attributes('aria-valuenow')).toBe('35')
    expect(handles[1]!.attributes('aria-valuenow')).toBe('65')

    for (let i = 0; i < 40; i += 1) await handles[0]!.trigger('keydown', { key: 'ArrowRight' })
    const low = Number(handles[0]!.attributes('aria-valuenow'))
    expect(low).toBeLessThanOrEqual(60)
    // 三段区域和文字注释都在
    expect(wrapper.find('.k2-band__zone--drop').exists()).toBe(true)
    expect(document.body.textContent).toContain('直接命中')
  })

  it('全局排除词：与关键词同一份标签输入，标签平铺可见、能删', async () => {
    const wrapper = await mountLoaded('judge', {
      ...snapshot,
      settings: { ...snapshot.settings, globalExcludeKeywords: ['剧透', '抽奖'] },
    })
    const field = wrapper.get('[data-test="setting-globalExcludeKeywords"]')
    expect(field.classes()).toContain('k2-field')
    expect(field.find('.k2-tags').exists()).toBe(true)

    const chips = field.findAll('.k2-chip--tag')
    expect(chips.map((chip) => chip.text())).toEqual(['剧透', '抽奖'])

    await chips[0]!.get('.k2-chip__x').trigger('click')
    await flushPromises()
    expect(
      wrapper.findAll('[data-test="setting-globalExcludeKeywords"] .k2-chip--tag'),
    ).toHaveLength(1)
  })

  it('界面语言：选完不立刻换，点保存那一下才落到偏好里', async () => {
    localStorage.removeItem('kestrel-ui')
    const wrapper = await mountLoaded('general')
    expect(wrapper.get('[data-test="card-save-region"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="setting-locale"]').trigger('click')
    await flushPromises()
    const items = [...document.querySelectorAll('.k2-menu__item')] as HTMLElement[]
    expect(items.length).toBeGreaterThan(1)
    items[1]!.click()
    await flushPromises()

    // 还没保存：界面文案没变（i18n 是 AppShell 跟着偏好换的），但保存按钮已经可点
    expect(document.body.textContent).toContain('区域设置')
    expect(wrapper.get('[data-test="card-save-region"]').attributes('disabled')).toBeUndefined()
    expect(localStorage.getItem('kestrel-ui') ?? '').not.toContain('"locale":"en"')

    await wrapper.get('[data-test="card-save-region"]').trigger('click')
    await flushPromises()

    // 保存这一下才真正写进界面偏好；界面语言不进设置接口
    expect(api.updateSettings).not.toHaveBeenCalled()
    expect(localStorage.getItem('kestrel-ui')).toContain('"locale":"en"')
    localStorage.removeItem('kestrel-ui')
  })

  it('rsshub 测试连接：测的是输入框里当前这串地址，不写任何设置', async () => {
    vi.mocked(api.probeRsshub).mockResolvedValue({
      configured: true,
      ok: true,
      baseUrl: 'http://192.168.5.100:1200',
      message: '实例连通',
      checkedAt: '2026-10-05T00:00:00.000Z',
    })
    const wrapper = await mountLoaded('collection')
    // 地址没填时按钮不可点
    expect(wrapper.get('[data-test="setting-rsshubTest"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="setting-rsshubBaseUrl"]').setValue('http://192.168.5.100:1200')
    await flushPromises()
    await wrapper.get('[data-test="setting-rsshubTest"]').trigger('click')
    await flushPromises()

    // 拿的是草稿里的地址（还没保存）
    expect(api.probeRsshub).toHaveBeenCalledWith(true, 'http://192.168.5.100:1200')
    const result = wrapper.get('[data-test="rsshub-test-result"]')
    expect(result.text()).toContain('实例连通')
    expect(result.text()).not.toContain(':1200')
    expect(result.classes()).toContain('k2-testresult--ok')
    expect(api.updateSettings).not.toHaveBeenCalled()
  })

  it('模板页：内置的只读、自定义的能改能删', async () => {
    const wrapper = await mountLoaded('delivery')
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
    const wrapper = await mountLoaded('delivery')

    await wrapper.get('[data-test="new-template"]').trigger('click')
    const dialog = dv('template-dialog')
    await dialog.get('[data-test="template-name-input"]').setValue('夜报版')
    await dialog.get('[data-test="template-content-input"]').setValue('{{title}}')
    await dialog.get('[data-test="form-dialog-submit"]').trigger('click')
    await flushPromises()

    expect(api.createTemplate).toHaveBeenCalledWith({ name: '夜报版', content: '{{title}}' })
  })

  it('模板页：删除自定义模板要确认，文案写明回落到默认模板', async () => {
    const wrapper = await mountLoaded('delivery')
    await wrapper.get('[data-test="template-delete"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('回落到默认模板')

    // 弹窗挂在 body 上，历史用例可能留着旧节点：取最后一个（当前这次挂载的）
    ;([...document.querySelectorAll('[data-test="confirm-ok"]')].pop() as HTMLElement).click()
    await flushPromises()
    await flushPromises()
    expect(api.removeTemplate).toHaveBeenCalledWith('t1')
  })
})
