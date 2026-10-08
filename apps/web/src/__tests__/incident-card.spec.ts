import type { Incident } from '@kestrel/contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import IncidentCard from '@/components/biz/IncidentCard.vue'
import vuetify from '@/plugins/vuetify'

const incident: Incident = {
  id: 'i1',
  kind: 'collection',
  targetId: 'd1',
  targetName: 'IT之家',
  groupId: 'g1',
  groupName: 'AI 与开发',
  code: 'fetch.http404',
  message: '地址返回 404，检查订阅地址是不是变了',
  detail: null,
  status: 'open',
  dismissedAt: null,
  firstSeenAt: '2026-10-07T09:00:00.000Z',
  createdAt: '2026-10-07T11:00:00.000Z',
}

function render(overrides: Partial<InstanceType<typeof IncidentCard>['$props']> = {}) {
  return mount(IncidentCard, {
    props: {
      incident,
      lastSeen: '10-07 19:00',
      dismissLabel: '忽视',
      groupLabel: '分组：AI 与开发',
      ...overrides,
    },
    global: { plugins: [vuetify] },
  })
}

describe('IncidentCard', () => {
  it('只放已有可信字段：对象名、原因、最近发生时间', () => {
    const wrapper = render()
    expect(wrapper.text()).toContain('IT之家')
    // 没给翻好的 reason（认不出的码 / 老数据）：退回记录里的原文
    expect(wrapper.text()).toContain('地址返回 404，检查订阅地址是不是变了')
    // 结构保持原样：时间仍在卡底那一行，只把那一行的内容换成「时钟图标 + 时间本身」
    expect(
      wrapper.find('[data-test="incident-foot"]').find('[data-test="incident-last-seen"]').exists(),
    ).toBe(true)
    const time = wrapper.find('[data-test="incident-last-seen"]')
    expect(time.text()).toContain('10-07 19:00')
    expect(time.find('.v-icon').exists()).toBe(true)
    expect(wrapper.find('[data-test="incident-first-seen"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('首次出现')
    expect(wrapper.text()).not.toContain('最近发生')
    // 前后端都没有「当前状态」这个功能，卡片不放状态胶囊
    expect(wrapper.find('[data-test="incident-status"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('待处理')
  })

  it('原因优先用页面翻好的当前语言文案，原文只作兜底', () => {
    const translated = render({
      reason: 'The address returned 404; the route or address may be wrong',
    })
    expect(translated.text()).toContain(
      'The address returned 404; the route or address may be wrong',
    )
    expect(translated.text()).not.toContain(incident.message)

    const fallback = render()
    expect(fallback.text()).toContain(incident.message)
  })

  it('副信息（30s / HTTP 503 / Unauthorized）单独占一行；不给就不占位', () => {
    const withDetail = render({ detail: 'HTTP 503' })
    expect(withDetail.get('[data-test="incident-detail"]').text()).toBe('HTTP 503')

    const without = render()
    expect(without.find('[data-test="incident-detail"]').exists()).toBe(false)
  })

  it('第二行副标题是分组；不给分组就不占位', () => {
    const withGroup = render()
    expect(withGroup.find('[data-test="incident-group"]').text()).toBe('分组：AI 与开发')
    const without = render({ groupLabel: '' })
    expect(without.find('[data-test="incident-group"]').exists()).toBe(false)
  })

  it('异常一律走危险色：采集 / 判定 / 推送都是红的', () => {
    for (const kind of ['collection', 'judgment', 'delivery'] as const) {
      const wrapper = render({ incident: { ...incident, kind } })
      expect(wrapper.find('[data-test="incident-row"]').classes()).toContain('k2-t-danger')
      expect(wrapper.find('[data-test="incident-row"]').classes()).not.toContain('k2-t-warning')
    }
  })

  it('没有「持续多久」也没有「立即检查」这类动作', () => {
    const wrapper = render()
    expect(wrapper.text()).not.toContain('持续')
    expect(wrapper.text()).not.toContain('立即检查')
  })

  it('点 × 抛出忽视事件，不自己改数据', async () => {
    const wrapper = render()
    await wrapper.find('[data-test="incident-dismiss"]').trigger('click')
    const emitted = wrapper.emitted('dismiss')
    expect(emitted).toHaveLength(1)
    const emittedIncident = emitted?.[0]?.[0]
    expect(emittedIncident).toBeDefined()
    expect((emittedIncident as Incident).id).toBe('i1')
    expect(wrapper.props('incident').status).toBe('open')
  })

  it('时间没给就不占位', () => {
    const wrapper = mount(IncidentCard, {
      props: { incident },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.find('[data-test="incident-last-seen"]').exists()).toBe(false)
  })
})
