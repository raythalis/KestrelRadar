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
      firstSeen: '首次出现 10-07 17:00',
      lastSeen: '最近发生 10-07 19:00',
      dismissLabel: '忽视',
      ...overrides,
    },
    global: { plugins: [vuetify] },
  })
}

describe('IncidentCard', () => {
  it('只放已有可信字段：对象名、原文、首次出现、最近发生', () => {
    const wrapper = render()
    expect(wrapper.text()).toContain('IT之家')
    expect(wrapper.text()).toContain('地址返回 404，检查订阅地址是不是变了')
    expect(wrapper.find('[data-test="incident-first-seen"]').text()).toContain('首次出现')
    expect(wrapper.find('[data-test="incident-last-seen"]').text()).toContain('最近发生')
    // 前后端都没有「当前状态」这个功能，卡片不放状态胶囊
    expect(wrapper.find('[data-test="incident-status"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('待处理')
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
    expect((emitted?.[0]?.[0] as Incident).id).toBe('i1')
    expect(wrapper.props('incident').status).toBe('open')
  })

  it('文本没给就不占位', () => {
    const wrapper = mount(IncidentCard, {
      props: { incident },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.find('[data-test="incident-foot"]').text()).toBe('')
  })
})
