import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ChannelDialog from '@/components/biz/ChannelDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容 teleport 到 body，挂上去以后直接查 document 才拿得到真实渲染结果
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ChannelDialog, {
    props: { modelValue: true, ...props },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

const q = (test: string): HTMLElement | null =>
  document.querySelector(`[data-test="${test}"]`) as HTMLElement | null
const input = (test: string): HTMLInputElement =>
  document.querySelector(`[data-test="${test}"] input`) as HTMLInputElement
const submit = (): HTMLButtonElement =>
  document.querySelector('[data-test="form-dialog-submit"]') as HTMLButtonElement
const click = async (el: HTMLElement | null): Promise<void> => {
  el?.click()
  await flushPromises()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChannelDialog', () => {
  it('打开时按入参填好，标题跟着是新建还是编辑', async () => {
    mountDialog({ name: '我的 Telegram', type: 'telegram', chatId: '123', hasSecret: true })
    await flushPromises()
    expect(input('channel-dialog-name').value).toBe('我的 Telegram')
    expect(document.body.textContent).toContain('编辑渠道')
  })

  it('新建时标题是新建渠道', async () => {
    mountDialog()
    await flushPromises()
    expect(document.body.textContent).toContain('新建渠道')
  })

  it('Telegram 出 token 与会话，不出 webhook 那两项', async () => {
    mountDialog({ name: 'TG', type: 'telegram', chatId: '123' })
    await flushPromises()
    expect(q('channel-dialog-bot-token')).toBeTruthy()
    expect(q('channel-dialog-chat-id')).toBeTruthy()
    expect(q('channel-dialog-url')).toBeNull()
    expect(q('channel-dialog-secret')).toBeNull()
  })

  it('Webhook 出地址与密钥，不出 Telegram 那两项', async () => {
    mountDialog({ name: 'Hook', type: 'webhook', url: 'https://example.com/hook' })
    await flushPromises()
    expect(input('channel-dialog-url').value).toBe('https://example.com/hook')
    expect(q('channel-dialog-secret')).toBeTruthy()
    expect(q('channel-dialog-bot-token')).toBeNull()
  })

  it('密钥不回显：配过就提示留空不改，没配过才给获取提示', async () => {
    mountDialog({ name: 'TG', type: 'telegram', chatId: '123', hasSecret: true })
    await flushPromises()
    expect(input('channel-dialog-bot-token').value).toBe('')
    expect(input('channel-dialog-bot-token').getAttribute('placeholder')).toBe(
      '已保存过，留空表示不改',
    )
    expect(document.body.textContent).not.toContain('找 BotFather 建一个 bot')

    document.body.innerHTML = ''
    mountDialog({ name: 'TG', type: 'telegram', chatId: '123', hasSecret: false })
    await flushPromises()
    expect(document.body.textContent).toContain('找 BotFather 建一个 bot')
  })

  it('提交时只带上属于当前类型的字段', async () => {
    const tg = mountDialog({ name: 'TG', type: 'telegram', chatId: '123', hasSecret: true })
    await flushPromises()
    input('channel-dialog-bot-token').value = 'new-token'
    input('channel-dialog-bot-token').dispatchEvent(new Event('input'))
    await flushPromises()
    await click(submit())
    expect(tg.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'TG',
      type: 'telegram',
      enabled: true,
      chatId: '123',
      url: '',
      secret: 'new-token',
    })

    document.body.innerHTML = ''
    const hook = mountDialog({ name: 'Hook', type: 'webhook', url: 'https://example.com/hook' })
    await flushPromises()
    await click(submit())
    expect(hook.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'Hook',
      type: 'webhook',
      enabled: true,
      chatId: '',
      url: 'https://example.com/hook',
      secret: '',
    })
  })

  it('没填全时保存按钮不可点', async () => {
    mountDialog()
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: 'TG', type: 'telegram', chatId: '123', hasSecret: false })
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: 'TG', type: 'telegram', hasSecret: true })
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: 'TG', type: 'telegram', chatId: '123', hasSecret: true })
    await flushPromises()
    expect(submit().disabled).toBe(false)

    document.body.innerHTML = ''
    mountDialog({ name: 'Hook', type: 'webhook', url: 'https://example.com/hook' })
    await flushPromises()
    expect(submit().disabled).toBe(false)
  })

  it('读取会话由页面接；读回来点一个就填进会话框', async () => {
    const wrapper = mountDialog({ name: 'TG', type: 'telegram', chatId: '', hasSecret: true })
    await flushPromises()
    await click(q('channel-dialog-chat-id')?.querySelector('button') as HTMLButtonElement)
    expect(wrapper.emitted('readChats')).toHaveLength(1)

    await wrapper.setProps({
      chats: [
        { id: '1231487971', title: '我自己' },
        { id: '1001', title: 'Kestrel 测试群' },
      ],
    })
    await flushPromises()
    const options = [...document.querySelectorAll('[data-test="channel-dialog-chats"] button')]
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      '我自己 · 1231487971',
      'Kestrel 测试群 · 1001',
    ])
    await click(options[1] as HTMLButtonElement)
    expect(input('channel-dialog-chat-id').value).toBe('1001')
  })

  it('这次没保存的输入不会留到下次打开', async () => {
    const wrapper = mountDialog({ name: 'TG', type: 'telegram', chatId: '123', hasSecret: true })
    await flushPromises()
    input('channel-dialog-name').value = '改了一半'
    input('channel-dialog-name').dispatchEvent(new Event('input'))
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(input('channel-dialog-name').value).toBe('TG')
  })
})
