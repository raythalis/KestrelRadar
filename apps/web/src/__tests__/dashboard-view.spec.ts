import type { Incident, RecentEvent, StatsOverview } from '@kestrel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  dismissIncident,
  fetchEventSources,
  fetchIncidents,
  fetchRecentEvents,
  fetchStatsOverview,
  markEventRead,
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
  detail: '30s',
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
    vi.mocked(fetchRecentEvents).mockResolvedValue({ events: [event], nextCursor: null, total: 1 })
    vi.mocked(fetchIncidents).mockResolvedValue({ incidents: [incident], limit: 20 })
    vi.mocked(fetchEventSources).mockResolvedValue([
      { discoveryId: 'd1', name: 'Hacker News 榜单', count: 1 },
    ])
    vi.mocked(dismissIncident).mockResolvedValue({ id: 'i1', status: 'dismissed' })
    vi.mocked(markEventRead).mockResolvedValue({ id: 'e1', readAt: iso(1) })
  })

  afterEach(() => {
    document.body.innerHTML = ''
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

  it('两块活跃区是面板：标题在面板头里，页面级不再有那一对标题', async () => {
    const wrapper = await ready('Qwen 发布原生全模态模型')

    expect(wrapper.findAll('[data-test="app-panel"]')).toHaveLength(2)
    // 迁移后页面顶部只有面板自己的头，旧的 section 标题没了
    expect(wrapper.find('.k2-sec').exists()).toBe(false)
    expect(wrapper.text()).toContain('24h内监听到的事件动态')
    expect(wrapper.text()).toContain('同一处异常60分钟内重复只更新时间，最多展示20条')
  })

  it('页头那句概述按时段换问候语', async () => {
    const wrapper = await ready('Qwen 发布原生全模态模型')
    const greeting = wrapper.get('[data-test="dashboard-greeting"]').text()

    expect(greeting).toMatch(/^(早上好|中午好|下午好|晚上好)，以下是系统今天的运行概况$/)
  })

  it('事件行点开新标签页并记已读；来源标签是真链接', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const wrapper = await ready('Qwen 发布原生全模态模型')
    const row = wrapper.get('[data-test="event-row"]')

    // 行本身不是 <a>（里面挂着来源标签），所以没有 href，靠 role=link + 点击
    expect(row.attributes('role')).toBe('link')
    expect(row.attributes('href')).toBeUndefined()
    expect(row.text()).toContain('Qwen 发布原生全模态模型')
    expect(row.text()).toContain('12 分钟前')
    // 来源标签是真链接，点它跳的是那家来源
    expect(row.get('a').attributes('href')).toBe('https://example.com/a')

    await row.trigger('click')
    expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer')
    await vi.waitFor(() => expect(vi.mocked(markEventRead)).toHaveBeenCalledWith('e1'))
    open.mockRestore()
  })

  it('事件超过 6 条：面板里只摆 6 条，多的收进底栏「查看全部事件」', async () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...event,
      id: `e${index + 1}`,
      title: `事件 ${index + 1}`,
    }))
    vi.mocked(fetchRecentEvents).mockResolvedValue({ events: many, nextCursor: null, total: 8 })

    const wrapper = await ready('事件 1')
    expect(wrapper.findAll('[data-test="event-row"]')).toHaveLength(6)
    expect(wrapper.get('[data-test="events-view-all-foot"]').text()).toContain('查看全部事件')
    // 徽章给的是后端的总数，不是这一屏渲染了几条
    expect(wrapper.get('.k2-panel__badge').text()).toBe('8')
  })

  it('数量卡里 0 / 0 的那张下面小字写「未配置」，配了但全停用还是「全部停用」', async () => {
    vi.mocked(fetchStatsOverview).mockResolvedValue(
      stats({
        counts: {
          discoveries: { enabled: 0, total: 0 },
          monitors: { enabled: 6, total: 6 },
          actions: { enabled: 4, total: 5 },
          channels: { enabled: 0, total: 4 },
        },
      }),
    )

    const wrapper = await ready('Qwen 发布原生全模态模型')
    const cards = wrapper.findAll('[data-test="metric-card"]')
    // 第一排四张是数量卡：发现 / 监控 / 动作 / 渠道
    // 上面照旧写 0 / 0，只有下面那行小字换成「未配置」
    expect(cards[0]!.get('.k2-num').text()).toBe('0/ 0')
    expect(cards[0]!.get('.k2-card__note').text()).toBe('未配置')
    expect(cards[1]!.get('.k2-num').text()).toBe('6/ 6')
    expect(cards[3]!.get('.k2-num').text()).toBe('0/ 4')
    expect(cards[3]!.get('.k2-card__note').text()).toBe('全部停用')
  })

  it('「查看全部」打开弹窗，弹窗里列的是后端给的那一页', async () => {
    const wrapper = await ready('Qwen 发布原生全模态模型')
    await wrapper.get('[data-test="events-view-all"]').trigger('click')
    await flushPromises()

    const dialog = document.querySelector('[data-test="app-event-dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.textContent).toContain('Qwen 发布原生全模态模型')
  })

  it('没有事件时给空状态，不摆空列表', async () => {
    vi.mocked(fetchRecentEvents).mockResolvedValue({ events: [], nextCursor: null, total: 0 })
    // 三块一起回来的：等异常那块落地，再断言事件那块是空状态
    const wrapper = await ready('GitHub Trending')

    expect(wrapper.find('[data-test="events-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="event-row"]').exists()).toBe(false)
  })

  it('异常卡显示对象名、当前语言的原因与最近发生时间（底行不写「首次出现」），忽视后那一行消失', async () => {
    const wrapper = await ready('GitHub Trending')
    const row = wrapper.get('[data-test="incident-row"]')
    // 第二行副标题写清楚这条异常属于哪个分组
    expect(row.get('[data-test="incident-group"]').text()).toBe('分组：AI 与开发')
    expect(row.text()).toContain('GitHub Trending')
    // 原因走语言包（码 → i18n key）：库里存的那句带参数的中文原文不再直接展示
    expect(row.text()).toContain('连接超时，对方长时间没有回应')
    expect(row.text()).not.toContain('连接超时（超过 30 秒没有回应）')
    // 语言无关的副信息不丢：超时秒数还在
    expect(row.get('[data-test="incident-detail"]').text()).toBe('30s')
    // 卡底那一行只有「时钟图标 + 最近发生时间」
    const time = row.get('[data-test="incident-foot"] [data-test="incident-last-seen"]')
    expect(time.find('.v-icon').exists()).toBe(true)
    expect(row.text()).not.toContain('首次出现')

    await row.get('[data-test="incident-dismiss"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-test="incident-row"]').exists()).toBe(false))
    expect(vi.mocked(dismissIncident)).toHaveBeenCalledWith('i1')
  })

  it('英文模式下异常原因也是英文，且不落库里的中文原文', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = await ready('GitHub Trending')
    const reason = wrapper.get('[data-test="incident-row"] .k2-card__message')
    expect(reason.text()).toContain('Connection timed out')
    expect(/[\u4e00-\u9fff]/.test(reason.text())).toBe(false)
    // 英文下主文案是英文，副信息（语言无关）仍在
    expect(wrapper.get('[data-test="incident-detail"]').text()).toBe('30s')
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

  it('八张卡拿不到就留空（数值不编 0）；事件与异常照常显示（三块各拉各的）', async () => {
    vi.mocked(fetchStatsOverview).mockRejectedValue(new Error('连不上后端'))
    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.find('[data-test="incident-row"]').exists()).toBe(true))

    // 页面不再自己弹浮层：请求失败的提示统一归 api/http.ts
    expect(useToastStore().items).toHaveLength(0)
    expect(wrapper.find('[data-test="event-row"]').exists()).toBe(true)
    const cards = wrapper.findAll('[data-test="metric-card"]')
    expect(cards).toHaveLength(8)
    expect(cards[0]!.text()).toContain('—')
    expect(cards[0]!.text()).not.toContain('全部启用')
  })
})
