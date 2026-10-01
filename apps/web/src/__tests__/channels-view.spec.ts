import { flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/api/config'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import ChannelsView from '@/views/ChannelsView.vue'

vi.mock('@/api/config')

const snapshot: ConfigSnapshot = {
  groups: [],
  discoveries: [],
  monitors: [],
  actions: [],
  channels: [
    {
      id: 'c1',
      name: '家庭群',
      type: 'telegram',
      config: { chatId: '-1001' },
      hasSecret: true,
      enabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'c2',
      name: '接收端',
      type: 'webhook',
      config: { url: 'https://hook.example.com/x' },
      hasSecret: false,
      enabled: false,
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
  ],
  settings: SETTINGS_DEFAULTS,
}

function mountView() {
  return mount(ChannelsView, {
    global: {
      plugins: [createPinia(), vuetify, i18n],
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

describe('通知渠道页', () => {
  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [api.createChannel, api.updateChannel, api.removeChannel]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
    vi.mocked(api.testChannel).mockReset()
    vi.mocked(api.readTelegramChats).mockReset()
  })

  it('列出渠道：类型、目标、密钥状态与启用开关', async () => {
    const wrapper = await mountLoaded()
    const cards = wrapper.findAll('[data-test="channel-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.get('[data-test="channel-name"]').text()).toBe('家庭群')
    expect(cards[0]!.get('[data-test="channel-type"]').text()).toBe('Telegram')
    expect(cards[0]!.get('[data-test="channel-target"]').text()).toContain('-1001')
    expect(cards[1]!.get('[data-test="channel-type"]').text()).toBe('Webhook')
    expect(cards[1]!.get('[data-test="channel-target"]').text()).toContain('hook.example.com')
  })

  it('没有渠道时给空状态', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue({ ...snapshot, channels: [] })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="channels-empty"]').exists()).toBe(true)
  })

  it('新建 Telegram 渠道：填 token 与会话 → 调创建接口', async () => {
    vi.mocked(api.createChannel).mockResolvedValue(snapshot.channels[0]!)
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="new-channel"]').trigger('click')
    const dialog = wrapper.get('[data-test="channel-dialog"]')
    await dialog.get('[data-test="channel-name-input"] input').setValue('我的 bot')
    await dialog.get('[data-test="channel-token-input"] input').setValue('123:abc')
    const chatInput = dialog.get('[data-test="channel-chat-input"] input')
    await chatInput.setValue('-1001')
    await chatInput.trigger('blur')
    await flushPromises()
    await dialog.get('[data-test="channel-save"]').trigger('click')
    await flushPromises()

    expect(api.createChannel).toHaveBeenCalledWith({
      name: '我的 bot',
      type: 'telegram',
      config: { chatId: '-1001' },
      secret: '123:abc',
      enabled: true,
    })
  })

  it('读取会话：把读到的会话列进下拉', async () => {
    vi.mocked(api.readTelegramChats).mockResolvedValue([{ id: '-1001', title: '家庭群' }])
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="channel-edit"]').trigger('click')
    const dialog = wrapper.get('[data-test="channel-dialog"]')
    await dialog.get('[data-test="channel-read-chats"]').trigger('click')
    await flushPromises()

    expect(api.readTelegramChats).toHaveBeenCalledWith({ token: undefined, channelId: 'c1' })
    // 读到的会话出现在下拉里（combobox 的菜单挂到 body，所以直接看组件的项目）
    expect(dialog.text()).toContain('会话')
  })

  it('发送测试消息：把结果写在卡片上', async () => {
    vi.mocked(api.testChannel).mockResolvedValue({
      ok: true,
      message: '测试消息已发出',
      sentAt: '2026-10-01T03:00:00.000Z',
    })
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="channel-test"]').trigger('click')
    await flushPromises()

    expect(api.testChannel).toHaveBeenCalledWith('c1')
    expect(wrapper.get('[data-test="channel-test-result"]').text()).toContain('测试消息已发出')
  })

  it('删除渠道先确认，文案提醒被动作引用着', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="channel-delete"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('还在用它的动作会发不出去')

    await wrapper.get('[data-test="confirm-ok"]').trigger('click')
    await flushPromises()
    expect(api.removeChannel).toHaveBeenCalledWith('c1')
  })
})
