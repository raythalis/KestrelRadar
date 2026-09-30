import { flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/api/config'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import ConfigView from '@/views/ConfigView.vue'

vi.mock('@/api/config')

const snapshot: ConfigSnapshot = {
  groups: [
    {
      id: 'g1',
      name: 'AI 圈',
      description: '模型发布与开源项目',
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'g2',
      name: '停用的分组',
      description: '暂时不看',
      enabled: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  discoveries: [
    {
      id: 'd1',
      groupId: 'g1',
      name: 'GitHub 日榜',
      kind: 'rsshub',
      target: '/github/trending/daily',
      cronExpression: '0 * * * *',
      enabled: true,
      nextRunAt: '2026-10-01T03:00:00.000Z',
      lastCheckedAt: '2026-10-01T02:00:00.000Z',
      routeOk: true,
      contentOk: true,
      lastCheckMessage: '路由通，内容 17 条',
      latestItemAt: '2026-10-01T01:30:00.000Z',
      itemCount: 17,
      baselineEstablishedAt: '2026-10-01T00:30:00.000Z',
      baselineItemCount: 17,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  monitors: [
    {
      id: 'm1',
      groupId: 'g1',
      name: '模型发布',
      mode: 'algorithm',
      sensitivity: 'medium',
      matchMode: 'any',
      intentText: '',
      includeKeywords: ['发布', '开源'],
      excludeKeywords: [],
      useGlobalExcludes: true,
      enabled: true,
      actionIds: ['a1'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  actions: [
    {
      id: 'a1',
      groupId: 'g1',
      name: '即时推送',
      triggerType: 'instant',
      channelId: 'c1',
      cronExpression: null,
      template: '',
      includeDelivered: false,
      mergeMessages: true,
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a2',
      groupId: 'g2',
      name: '没选渠道的动作',
      triggerType: 'instant',
      channelId: '',
      cronExpression: null,
      template: '',
      includeDelivered: false,
      mergeMessages: true,
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  channels: [
    {
      id: 'c1',
      name: '场景-助手 · Telegram',
      type: 'webhook',
      config: {},
      hasSecret: true,
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  modelProviders: [],
  models: [],
  settings: SETTINGS_DEFAULTS,
}

function mountView() {
  return mount(ConfigView, {
    global: {
      plugins: [createPinia(), vuetify, i18n],
      // 弹窗内容直接渲染在组件树里，方便断言
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

describe('配置管理页', () => {
  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [
      api.createGroup,
      api.updateGroup,
      api.removeGroup,
      api.removeDiscovery,
      api.removeMonitor,
      api.removeAction,
      api.updateDiscovery,
      api.updateMonitor,
      api.updateAction,
    ]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
  })

  it('分组按折叠块列出，头部有简介与三列计数', async () => {
    const wrapper = await mountLoaded()
    const sections = wrapper.findAll('[data-test="group-section"]')
    expect(sections).toHaveLength(2)
    expect(sections[0]!.get('[data-test="group-name"]').text()).toContain('AI 圈')
    expect(sections[0]!.get('[data-test="group-counts"]').text()).toBe('1 发现 · 1 监听 · 1 动作')
    // 停用的分组带头部标记
    expect(sections[1]!.find('[data-test="group-disabled"]').exists()).toBe(true)
    // 折叠态看不到三列
    expect(wrapper.find('[data-test="column-discoveries"]').exists()).toBe(false)
  })

  it('展开分组后是三列，卡片显示各自的字段', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="group-toggle"]').trigger('click')

    expect(wrapper.get('[data-test="column-discoveries"]').text()).toContain('内容从哪来')
    expect(wrapper.get('[data-test="column-monitors"]').text()).toContain('什么算命中')

    const discovery = wrapper.get('[data-test="discovery-card"]')
    expect(discovery.get('[data-test="discovery-kind"]').text()).toBe('RSSHub 路由')
    expect(discovery.get('[data-test="discovery-target"]').text()).toBe('/github/trending/daily')
    expect(discovery.get('[data-test="baseline-note"]').text()).toContain('不计入推送')

    const monitor = wrapper.get('[data-test="monitor-card"]')
    expect(monitor.get('[data-test="monitor-keywords"]').text()).toContain('发布')
    expect(monitor.get('[data-test="monitor-bound"]').text()).toBe('仅走 即时推送')

    const action = wrapper.get('[data-test="action-card"]')
    expect(action.get('[data-test="action-channel"]').text()).toContain('场景-助手 · Telegram')
    expect(action.get('[data-test="action-referenced"]').text()).toBe('被 1 条监听引用')
  })

  it('没选渠道的动作给黄色提示', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="toggle-all"]').trigger('click')
    const warnings = wrapper.findAll('[data-test="action-warning"]')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.text()).toContain('还没选通知渠道')
  })

  it('新建分组：填名称 → 保存调用接口', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="new-group"]').trigger('click')
    const input = wrapper.get('[data-test="group-name-input"] input')
    await input.setValue('新分组')
    await wrapper.get('[data-test="group-save"]').trigger('click')
    await flushPromises()

    expect(api.createGroup).toHaveBeenCalledWith({ name: '新分组', description: '', enabled: true })
  })

  it('删除分组：先确认，确认后调用接口', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="group-delete"]').trigger('click')
    expect(wrapper.get('[data-test="confirm-dialog"]').text()).toContain(
      '已经采到的条目与事件一律保留',
    )

    await wrapper.get('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeGroup).toHaveBeenCalledWith('g1')
  })

  it('删除发现的确认文案写明历史保留', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="group-toggle"]').trigger('click')
    await wrapper.get('[data-test="discovery-delete"]').trigger('click')
    expect(wrapper.get('[data-test="confirm-dialog"]').text()).toContain('历史条目与事件一律保留')

    await wrapper.get('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeDiscovery).toHaveBeenCalledWith('d1')
  })

  it('批量删除所选分组：没有选中时不出现入口', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.find('[data-test="delete-selected"]').exists()).toBe(false)

    for (const checkbox of wrapper.findAll('[data-test="group-select"] input')) {
      await checkbox.setValue(true)
    }
    const button = wrapper.get('[data-test="delete-selected"]')
    expect(button.text()).toContain('2')

    await button.trigger('click')
    await wrapper.get('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeGroup).toHaveBeenCalledWith('g1')
    expect(api.removeGroup).toHaveBeenCalledWith('g2')
  })

  it('启用开关直接写回后端', async () => {
    const wrapper = await mountLoaded()
    const switchInput = wrapper.get('[data-test="group-enabled"] input')
    await switchInput.setValue(false)
    await flushPromises()
    expect(api.updateGroup).toHaveBeenCalledWith('g1', { enabled: false })
  })
})
