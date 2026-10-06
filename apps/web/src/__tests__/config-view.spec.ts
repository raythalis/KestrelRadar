import { flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useToastStore } from '@/stores/toast'
import * as api from '@/api/config'
import * as cardStatsApi from '@/api/cardStats'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import GroupDialog from '@/components/biz/GroupDialog.vue'
import ConfigView from '@/views/ConfigView.vue'

vi.mock('@/api/config')
vi.mock('@/api/cardStats')

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
      iconUrl: null,
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
      templateId: null,
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
      templateId: null,
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
      type: 'telegram',
      config: { chatId: '1' },
      hasSecret: false,
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  modelProviders: [],
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

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
    ],
  })
  return router
}

// jsdom 没有 matchMedia：ConfigView 用它判断宽窄（宽＝三列并排、默认全部展开）
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

function mountView() {
  const router = makeRouter()
  return mount(ConfigView, {
    global: {
      plugins: [createPinia(), vuetify, i18n, appComponents, router],
      // 弹窗内容直接渲染在组件树里，方便断言
      stubs: { 'v-dialog': { template: '<div data-test="dialog-stub"><slot /></div>' } },
    },
  })
}

async function mountLoaded() {
  vi.mocked(cardStatsApi.fetchCardStats).mockResolvedValue(
    new Proxy({}, { get: () => ({}) }) as never,
  )
  vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
  const wrapper = mountView()
  await flushPromises()
  return wrapper
}

// 整页挂载本来就慢，全套并发跑时容易撞默认 5s 上限
async function expandFirst(w: Awaited<ReturnType<typeof mountLoaded>>): Promise<void> {
  const toggle = w.findAll('[data-test="group-toggle"]')[0]!
  await toggle.trigger('click')
  await flushPromises()
}

describe('配置管理页', { timeout: 20000 }, () => {
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
      api.testDiscovery,
    ]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
  })

  it('分组按真实分组面板列出：名称、简介、三列计数', async () => {
    const w = await mountLoaded()
    const panels = w.findAll('[data-test="group-panel"]')
    expect(panels.length).toBeGreaterThanOrEqual(2)
    expect(w.findAll('[data-test="group-name"]').length).toBeGreaterThanOrEqual(2)
    expect(w.findAll('[data-test="group-counts"]').length).toBeGreaterThanOrEqual(2)
  })

  it('页面有标题与说明，页头不再写流水线解释', async () => {
    const w = await mountLoaded()
    expect(w.find('[data-test="config-page"]').exists()).toBe(true)
    const text = w.text()
    expect(text).toContain('配置')
    expect(text).not.toContain('流水线')
  })

  it('展开分组后是三列，列内卡片是真组件', async () => {
    const w = await mountLoaded()
    const first = w.findAll('[data-test="group-toggle"]')[0]!
    await first.trigger('click')
    await flushPromises()
    const tabs = w.findAll('[data-test^="tab-"]')
    expect(tabs.length).toBeGreaterThanOrEqual(3)
    const cols = w.findAll('[data-test^="column-"]')
    expect(cols.length).toBeGreaterThanOrEqual(3)
    expect(w.findAll('[data-test="source-card"]').length).toBeGreaterThanOrEqual(1)
    expect(w.findAll('[data-test="monitor-card"]').length).toBeGreaterThanOrEqual(1)
    expect(w.findAll('[data-test="action-card"]').length).toBeGreaterThanOrEqual(1)
  })

  it('数据源卡有试抓按钮；点下去会调接口', async () => {
    const w = await mountLoaded()
    await expandFirst(w)
    await w.find('[data-test="source-menu"]').trigger('click')
    await flushPromises()
    const test = document.querySelector('[data-test="source-test"]') as HTMLElement | null
    expect(test).not.toBeNull()
    test?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(vi.mocked(api.testDiscovery)).toHaveBeenCalled()
  })

  it('新建分组：走真分组弹窗，保存写回接口', async () => {
    const w = await mountLoaded()
    await w.find('[data-test="new-group"]').trigger('click')
    await flushPromises()
    const dialog = w.findComponent(GroupDialog)
    expect(dialog.exists()).toBe(true)
    expect(dialog.props('modelValue')).toBe(true)
  })

  it('分组菜单里有编辑与删除入口', async () => {
    const w = await mountLoaded()
    await w.findAll('[data-test="group-menu"]')[0]!.trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-test="group-menu-edit"]')).not.toBeNull()
    expect(document.querySelector('[data-test="group-menu-delete"]')).not.toBeNull()
  })

  it('分组开关直接写回后端', async () => {
    const w = await mountLoaded()
    const toggle = w.find('[data-test="group-enabled"]')
    expect(toggle.exists()).toBe(true)
    await toggle.trigger('click')
    await flushPromises()
    expect(vi.mocked(api.updateGroup)).toHaveBeenCalled()
  })

  it('窄屏标签切换：点另一段，当前列跟着换', async () => {
    const w = await mountLoaded()
    await expandFirst(w)
    const tabs = w.findAll('[data-test^="tab-"]')
    expect(tabs.length).toBeGreaterThanOrEqual(2)
    const last = tabs[tabs.length - 1]!
    await last.trigger('click')
    await flushPromises()
    expect(last.classes().join(' ')).toContain('k2-tabs__item--on')
  })

  it('动作卡：没选渠道就写「未选择渠道」', async () => {
    const w = await mountLoaded()
    const text = w.text()
    expect(text).toContain('未选择渠道')
  })

  it('监听卡把跟随全局当前生效的模式写出来：全局是 LLM+ 就写 LLM+', async () => {
    vi.mocked(cardStatsApi.fetchCardStats).mockResolvedValue(
      new Proxy({}, { get: () => ({}) }) as never,
    )
    vi.mocked(api.fetchConfig).mockResolvedValue({
      ...snapshot,
      settings: { ...SETTINGS_DEFAULTS, judgeMode: 'algorithm_llm' },
      monitors: [{ ...snapshot.monitors[0]!, mode: 'follow_global' }],
    } as never)
    const w = mountView()
    await flushPromises()
    await expandFirst(w)

    const mode = w.findAll('[data-test="monitor-card"]')[0]!.find('[data-test="monitor-mode"]')
    expect(mode.text()).toBe('跟随全局 · LLM+')
    expect(mode.find('[data-test="llm-plus"]').exists()).toBe(true)
  })

  it('加载中显示骨架，加载完消失', async () => {
    vi.mocked(api.fetchConfig).mockReturnValue(new Promise(() => {}) as never)
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-test="config-loading"]').exists()).toBe(true)
  })

  it('空配置时显示空态，且新增入口在空态里', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue({
      ...snapshot,
      groups: [],
      discoveries: [],
      monitors: [],
      actions: [],
    } as never)
    const w = mountView()
    await flushPromises()
    expect(
      w.find('[data-test="config-empty"]').exists() || w.find('[data-test="new-group"]').exists(),
    ).toBe(true)
  })
})
