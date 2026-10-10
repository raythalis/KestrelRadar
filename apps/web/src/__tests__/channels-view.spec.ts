import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import type { ConfigSnapshot } from '@kestrel/contracts'
import { SETTINGS_DEFAULTS } from '@kestrel/contracts'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'
import * as api from '@/api/config'
import i18n from '@/plugins/i18n'
import appComponents from '@/plugins/components'
import vuetify from '@/plugins/vuetify'
import ChannelsView from '@/views/ChannelsView.vue'

vi.mock('@/api/config')
// 卡片汇总来自另一个模块：不 mock 的话会发真实请求，store.load() 一直等它，页面就永远是空的
vi.mock('@/api/cardStats')

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

// 弹窗走真组件并 teleport 到 body：页面与弹窗都在 document 里，
// 这里统一用 DOMWrapper 从 document 取，VTU 的 trigger / classes / text 都照常用。
const dv = (test: string): DOMWrapper<Element> =>
  new DOMWrapper(document.querySelector(`[data-test="${test}"]`) as Element)

function mountView() {
  return mount(ChannelsView, {
    // 弹窗走真组件 + teleport：挂到 document body，别替身（替身后点击不会触达组件）
    attachTo: document.body,
    global: { plugins: [createPinia(), vuetify, i18n, appComponents] },
  })
}

async function mountLoaded() {
  vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
  const wrapper = mountView()
  await flushPromises()
  return wrapper
}

describe('通知渠道页', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.mocked(api.fetchConfig).mockReset()
    for (const fn of [api.createChannel, api.updateChannel, api.removeChannel]) {
      vi.mocked(fn).mockReset()
      vi.mocked(fn).mockResolvedValue(undefined as never)
    }
    vi.mocked(api.testChannel).mockReset()
    vi.mocked(api.readTelegramChats).mockReset()
  })

  it('已有缓存时重新进入页面仍向后端取最新渠道', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue(snapshot)
    const pinia = createPinia()
    const store = useConfigStore(pinia)
    await store.load()
    vi.mocked(api.fetchConfig).mockClear()
    const wrapper = mount(ChannelsView, {
      global: { plugins: [pinia, vuetify, i18n, appComponents] },
    })
    await flushPromises()
    expect(api.fetchConfig).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('列出渠道：名称与类型', async () => {
    const wrapper = await mountLoaded()
    const cards = wrapper.findAll('[data-test="channel-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.get('[data-test="channel-name"]').text()).toBe('家庭群')
    expect(cards[0]!.get('[data-test="channel-kind"]').text()).toBe('Telegram')
    expect(cards[1]!.get('[data-test="channel-kind"]').text()).toBe('Webhook')
  })

  it('没有渠道时给空状态', async () => {
    vi.mocked(api.fetchConfig).mockResolvedValue({ ...snapshot, channels: [] })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="channels-empty"]').exists()).toBe(true)
  })

  it('新建渠道的类型下拉每项都带图标（与动作卡片选渠道同一套）', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="new-channel"]').trigger('click')

    const telegram = wrapper.get('[data-test="new-channel-telegram"]')
    const webhook = wrapper.get('[data-test="new-channel-webhook"]')
    expect(telegram.find('[data-test="channel-brand-icon"]').exists()).toBe(true)
    expect(webhook.find('i.mdi-webhook').exists()).toBe(true)
  })

  it('新建 Telegram 渠道：填 token 与会话 → 调创建接口', async () => {
    vi.mocked(api.createChannel).mockResolvedValue(snapshot.channels[0]!)
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="new-channel"]').trigger('click')
    await wrapper.get('[data-test="new-channel-telegram"]').trigger('click')
    const dialog = dv('channel-dialog')
    await dialog.get('input[data-test="channel-dialog-name"]').setValue('我的 bot')
    await dialog.get('input[data-test="channel-dialog-bot-token"]').setValue('123:abc')
    const chatInput = dialog.get('input[data-test="channel-dialog-chat-id"]')
    await chatInput.setValue('-1001')
    await chatInput.trigger('blur')
    await flushPromises()
    await dialog.get('[data-test="form-dialog-submit"]').trigger('click')
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
    vi.mocked(api.readTelegramChats).mockResolvedValue({
      ok: true,
      message: '',
      data: { chats: [{ id: '-1001', title: '家庭群' }] },
    })
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="channel-card"]').trigger('click')
    const dialog = dv('channel-dialog')
    await dialog.get('[data-test="app-button"]').trigger('click')
    await flushPromises()

    expect(api.readTelegramChats).toHaveBeenCalledWith({ token: undefined, channelId: 'c1' })
    // 读到的会话出现在下拉里（combobox 的菜单挂到 body，所以直接看组件的项目）
    expect(dialog.text()).toContain('会话')
  })

  it('测试连接成功：报一条绿色浮层，卡片圆点变绿', async () => {
    vi.mocked(api.testChannel).mockResolvedValue({
      ok: true,
      message: '',
      data: { sentAt: '2026-10-01T03:00:00.000Z' },
    })
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="channel-test"]').trigger('click')
    await flushPromises()

    expect(api.testChannel).toHaveBeenCalledWith('c1')
    expect(wrapper.get('[data-test="channel-test"]').classes()).toContain('k2-chan__probe--ok')
    // 测试是「做过一件事」：成没成都在浮层说，卡片上不再有第二处结论
    const items = useToastStore().items
    expect(items).toHaveLength(1)
    expect(items[0]!.tone).toBe('success')
    expect(items[0]!.text).toContain('测试消息已投递')
    expect(wrapper.find('[data-test="channel-test-note"]').exists()).toBe(false)
  })

  it('测试连接业务失败：浮层按码给人话，圆点标红', async () => {
    vi.mocked(api.testChannel).mockResolvedValue({
      ok: false,
      code: 'AUTH_FAILED',
      message: 'bot token 不对：Unauthorized',
    })
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="channel-test"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="channel-test"]').classes()).toContain('k2-chan__probe--fail')
    const items = useToastStore().items
    expect(items).toHaveLength(1)
    expect(items[0]!.tone).toBe('danger')
    // 文案由前端按码映射：后端原文只当兜底，不铺到界面上
    expect(items[0]!.text).toBe('家庭群：认证失败，请检查密钥或凭证后重试')
    expect(items[0]!.text).not.toContain('Unauthorized')
  })

  it('测试请求本身失败（接口 500）：只把圆点标红，浮层归 http.ts 统一弹', async () => {
    vi.mocked(api.testChannel).mockRejectedValue(new Error('服务暂时不可用，稍后再试'))
    const wrapper = await mountLoaded()

    await wrapper.get('[data-test="channel-test"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="channel-test"]').classes()).toContain('k2-chan__probe--fail')
    // 页面不再自己处理请求失败：这一层由 api/http.ts 的浮层负责
    expect(useToastStore().items).toHaveLength(0)
  })

  it('删除渠道先确认，文案提醒被动作引用着', async () => {
    const wrapper = await mountLoaded()
    await wrapper.get('[data-test="channel-delete"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('还在用它的动作将无法投递通知')

    // 弹窗挂在 body 上，历史用例可能留着旧节点：取最后一个（当前这次挂载的）
    ;([...document.querySelectorAll('[data-test="confirm-ok"]')].pop() as HTMLElement).click()
    await flushPromises()
    await flushPromises()
    expect(api.removeChannel).toHaveBeenCalledWith('c1')
  })
})
