import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSwitch from '@/components/app/AppSwitch.vue'
import SourceCard from '@/components/biz/SourceCard.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(SourceCard, {
    props: {
      name: 'B 站排行',
      kindLabel: 'RSSHub 路由',
      enabled: true,
      target: '/bilibili/ranking/all',
      instance: 'http://192.168.5.100:1200',
      frequency: '每 30 分钟',
      tone: 'ok',
      statusText: '抓到 100 条',
      foundItemCount: 100,
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
  })
}

describe('SourceCard', () => {
  it('实例地址与路由路径分开显示，路由是等宽', () => {
    const wrapper = mountCard({ instance: 'http://192.168.5.100:1200' })
    expect(wrapper.find('[data-test="source-target"]').text()).toBe('/bilibili/ranking/all')
    expect(wrapper.find('[data-test="source-instance"]').text()).toBe('http://192.168.5.100:1200')
    expect(wrapper.find('[data-test="source-target"]').classes()).toContain('biz-card__sub--mono')
  })

  it('状态四档：未测 / 有内容 / 通但空 / 不通', () => {
    const toneOf = (props: Record<string, unknown>) =>
      mountCard(props).find('[data-test="source-status"]').classes().join(' ')
    expect(toneOf({ tone: 'neutral', statusText: '还没试过' })).toContain('app-status--neutral')
    expect(toneOf({ tone: 'ok' })).toContain('app-status--ok')
    expect(toneOf({ tone: 'warn' })).toContain('app-status--warn')
    expect(toneOf({ tone: 'err' })).toContain('app-status--err')
  })

  it('抓取中：状态点转起来、试抓按钮带转圈并挡住重复点击', async () => {
    const wrapper = mountCard({ busy: true })
    expect(wrapper.find('[data-test="source-status"]').classes()).toContain('app-status--busy')
    expect(wrapper.find('[data-test="source-test"] .app-spinner').exists()).toBe(true)
    // 加载中的按钮不打 disabled（P1 的规矩：保留主色，用点击守卫挡重复提交）
    await wrapper.find('[data-test="source-test"]').trigger('click')
    expect(wrapper.emitted('test')).toBeUndefined()
  })

  it('停用的数据源不能试抓（免得白抓）', () => {
    const wrapper = mountCard({ enabled: false })
    expect(wrapper.classes()).toContain('is-off')
    expect((wrapper.find('[data-test="source-test"]').element as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('出问题才给提醒行，正常时没有', () => {
    expect(mountCard().find('[data-test="source-message"]').exists()).toBe(false)
    const warn = mountCard({ message: '连通但没抓到内容', tone: 'warn' })
    expect(warn.find('[data-test="source-message"]').text()).toBe('连通但没抓到内容')
    expect(warn.find('[data-test="source-message"]').classes()).toContain('app-hint--warn')
  })

  it('事件：试抓 / 编辑 / 删除 / 开关', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="source-test"]').trigger('click')
    await wrapper.find('[data-test="source-edit"]').trigger('click')
    await wrapper.find('[data-test="source-delete"]').trigger('click')
    wrapper.findComponent(AppSwitch).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('test')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })
})
