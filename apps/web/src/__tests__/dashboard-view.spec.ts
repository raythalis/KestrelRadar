import type { Incident, RecentEvent, StatsOverview } from '@kestrel/contracts'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  dismissIncident,
  fetchIncidents,
  fetchRecentEvents,
  fetchStatsOverview,
} from '@/api/dashboard'
import { useToastStore } from '@/stores/toast'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import DashboardView from '@/views/DashboardView.vue'

vi.mock('@/api/dashboard')

const now = Date.now()
const iso = (minutesAgo: number): string => new Date(now - minutesAgo * 60_000).toISOString()

function stats(overrides: Partial<StatsOverview> = {}): StatsOverview {
  return {
    counts: {
      discoveries: { enabled: 3, total: 4 },
      monitors: { enabled: 6, total: 6 },
      actions: { enabled: 4, total: 5 },
      channels: { enabled: 0, total: 4 },
    },
    events: { today: 28, yesterday: 25 },
    delivery: { sent: 7, failed: 0, rate: 1 },
    collection: { windowDays: 7, rounds: 20, okRounds: 19, rate: 0.95, failingSources: 1 },
    rsshub: {
      configured: true,
      ok: true,
      baseUrl: 'http://rsshub:1200',
      message: '',
      checkedAt: iso(2),
    },
    ...overrides,
  }
}

const event: RecentEvent = {
  id: 'e1',
  title: 'Qwen 发布原生全模态模型',
  url: 'https://example.com/a',
  kind: 'rss',
  groupId: 'g1',
  groupName: 'AI 与开发',
  sources: [{ discoveryId: 'd1', name: 'Hacker News 榜单', url: 'https://example.com/a' }],
  sourceNames: ['Hacker News 榜单'],
  sourceCount: 1,
  itemCount: 2,
  firstItemAt: iso(30),
  lastItemAt: iso(12),
  readAt: null,
}

const incident: Incident = {
  id: 'i1',
  kind: 'collection',
  targetId: 'd1',
  targetName: 'GitHub Trending',
  groupId: 'g1',
  groupName: 'AI 与开发',
  code: 'fetch.timeout',
  message: '连接超时（超过 30 秒没有回应）',
  detail: null,
  status: 'open',
  dismissedAt: null,
  firstSeenAt: iso(120),
  createdAt: iso(10),
}

function mountView() {
  return mount(DashboardView, { global: { plugins: [createPinia(), vuetify, i18n] } })
}

/**
 * 挂载后等数据真的到齐再断言：
 * 八张卡在数据回来之前就会渲染（数值位是「—」），所以不能拿它当加载完成的信号。
 */
async function ready(marker: string): Promise<ReturnType<typeof mountView>> {
  const wrapper = mountView()
  // 等的字样必须是「数据回来才会出现」的：首帧的 loading=false 会先渲染一次空状态，
  // 拿空状态的文案当信号会撞上那一帧。
  await vi.waitFor(() => expect(wrapper.text()).toContain(marker))
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('仪表盘页', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh-CN'
    vi.mocked(fetchStatsOverview).mockResolvedValue(stats())
    vi.mocked(fetchRecentEvents).mockResolvedValue({ events: [event], nextCursor: null })
    vi.mocked(fetchIncidents).mockResolvedValue({ incidents: [incident], limit: 20 })
    vi.mocked(dismissIncident).mockResolvedValue({ id: 'i1', status: 'dismissed' })
  })

  it('八张卡：数量类给启用数与「n 个已停用」，状态类给数值与副文案', async () => {
    const wrapper = await ready('较昨日 +12%')
    const text = wrapper.text()

    expect(wrapper.findAll('[data-test="metric-card"]')).toHaveLength(8)
    // 数量类：3 / 4 且写出停用数；全启用写「全部启用」；全停用写「全部停用」
    expect(text).toContain('3/ 4')
    expect(text).toContain('1 个已停用')
    expect(text).toContain('全部启用')
    expect(text).toContain('全部停用')
    // 状态类：今日新事件与较昨日、投递、采集窗口、RSSHub 连通
    expect(text).toContain('28')
    expect(text).toContain('较昨日 +12%')
    expect(text).toContain('全部送达 · 成功率 100%')
    expect(text).toContain('95')
    expect(text).toContain('近 7 天 · 1 个源偶发失败')
    expect(text).toContain('连通')
    expect(text).toContain('2 分钟前探测')
  })

  it('事件行点开新标签页，时间是相对时间；来源只写一次不重复', async () => {
    const wrapper = await ready('Qwen 发布原生全模态模型')
    const row = wrapper.get('[data-test="event-row"]')

    expect(row.attributes('href')).toBe('https://example.com/a')
    expect(row.attributes('target')).toBe('_blank')
    expect(row.text()).toContain('Qwen 发布原生全模态模型')
    expect(row.text()).toContain('Hacker News 榜单')
    expect(row.text()).toContain('12 分钟前')
  })

  it('没有事件时给空状态，不摆空列表', async () => {
    vi.mocked(fetchRecentEvents).mockResolvedValue({ events: [], nextCursor: null })
    // 三块一起回来的：等异常那块落地，再断言事件那块是空状态
    const wrapper = await ready('GitHub Trending')

    expect(wrapper.find('[data-test="events-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="event-row"]').exists()).toBe(false)
  })

  it('异常卡显示对象名、错误原文与首次时间（副标题不重复类型和分组），忽视后那一行消失', async () => {
    const wrapper = await ready('GitHub Trending')
    const row = wrapper.get('[data-test="incident-row"]')
    expect(row.text()).toContain('GitHub Trending')
    expect(row.text()).toContain('连接超时（超过 30 秒没有回应）')
    // 副标题只留「时间 首次出现」：类型和分组行里已经有了
    expect(row.text()).toContain('首次出现')
    expect(row.text()).not.toContain('AI 与开发')

    await row.get('[data-test="incident-dismiss"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-test="incident-row"]').exists()).toBe(false))
    expect(vi.mocked(dismissIncident)).toHaveBeenCalledWith('i1')
  })

  it('RSSHub 没配地址时说「未配置」，不是「连不上」', async () => {
    vi.mocked(fetchStatsOverview).mockResolvedValue(
      stats({
        rsshub: {
          configured: false,
          ok: false,
          baseUrl: '',
          message: '还没有配置 RSSHub 实例地址',
          checkedAt: null,
        },
      }),
    )
    const wrapper = await ready('未配置')
    expect(wrapper.text()).toContain('未配置')
    expect(wrapper.text()).toContain('没配 RSSHub 地址')
  })

  it('八张卡拿不到就报错，数值不编 0；事件与异常照常显示（三块各拉各的）', async () => {
    vi.mocked(fetchStatsOverview).mockRejectedValue(new Error('连不上后端'))
    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.find('[data-test="incident-row"]').exists()).toBe(true))

    expect(
      useToastStore()
        .items.map((item) => item.text)
        .join(' '),
    ).toContain('拉取仪表盘数据失败')
    expect(wrapper.find('[data-test="event-row"]').exists()).toBe(true)
    const cards = wrapper.findAll('[data-test="metric-card"]')
    expect(cards).toHaveLength(8)
    expect(cards[0]!.text()).toContain('—')
    expect(cards[0]!.text()).not.toContain('全部启用')
  })
})
