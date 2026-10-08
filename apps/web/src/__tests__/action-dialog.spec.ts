import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ActionDialog from '@/components/biz/ActionDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容 teleport 到 body，挂上去以后直接查 document 才拿得到真实渲染结果
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ActionDialog, {
    props: {
      modelValue: true,
      channels: [
        { id: 'c1', name: '我的 Telegram', type: 'telegram', enabled: true },
        { id: 'c4', name: '停用的 Webhook', type: 'webhook', enabled: false },
      ],
      templates: [
        { id: 't1', name: '默认模板' },
        { id: 't2', name: '简报模板' },
      ],
      ...props,
    },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

const q = (test: string): HTMLElement | null =>
  document.querySelector(`[data-test="${test}"]`) as HTMLElement | null
/* 真实结构：data-test 直接挂在 <input> 上（不是外层包装），两种写法都兼容 */
const input = (test: string): HTMLInputElement =>
  (document.querySelector(`[data-test="${test}"] input`) ??
    document.querySelector(`[data-test="${test}"]`)) as HTMLInputElement
/** 下拉浮层是 teleport 出来的；jsdom 里点不开 Vuetify 的 v-select，得按一下方向键 */
const openMenu = async (test: string): Promise<void> => {
  const el = input(test)
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushPromises()
}
const submit = (): HTMLButtonElement =>
  document.querySelector('[data-test="form-dialog-submit"]') as HTMLButtonElement
const click = async (el: HTMLElement | null): Promise<void> => {
  el?.click()
  await flushPromises()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ActionDialog', () => {
  it('打开时按入参填好，标题是新建还是编辑', async () => {
    mountDialog({ name: '实时推送', channelId: 'c1', templateId: 't2', triggerType: 'digest' })
    await flushPromises()
    expect(input('action-dialog-name').value).toBe('实时推送')
    expect(q('action-dialog-channel')?.textContent).toContain('我的 Telegram')
    expect(q('action-dialog-template')?.textContent).toContain('简报模板')
    expect(document.body.textContent).toContain('编辑动作')

    document.body.innerHTML = ''
    mountDialog()
    await flushPromises()
    expect(document.body.textContent).toContain('添加动作')
    // 新建时模板默认落在系统内置
    expect(q('action-dialog-template')?.textContent).toContain('系统内置（默认模板）')
  })

  it('汇总时间与「包含已即时推送过的内容」只在每天汇总时出现', async () => {
    mountDialog({ name: '汇总', channelId: 'c1', triggerType: 'instant' })
    await flushPromises()
    expect(q('action-dialog-cron')).toBeNull()
    expect(q('action-dialog-include-delivered')).toBeNull()

    document.body.innerHTML = ''
    mountDialog({ name: '汇总', channelId: 'c1', triggerType: 'digest', cron: '0 8 * * *' })
    await flushPromises()
    expect(q('action-dialog-cron')).toBeTruthy()
    expect(input('action-dialog-cron').value).toBe('0 8 * * *')
    expect(q('action-dialog-include-delivered')).toBeTruthy()
  })

  it('提交时带上全部字段；发现即发的发送时间是 null', async () => {
    const wrapper = mountDialog({
      name: '实时推送',
      triggerType: 'instant',
      channelId: 'c1',
      templateId: 't1',
      mergeMessages: false,
      includeDelivered: true,
      enabled: false,
    })
    await flushPromises()
    await click(submit())
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      name: '实时推送',
      triggerType: 'instant',
      cron: null,
      channelId: 'c1',
      templateId: 't1',
      mergeMessages: false,
      includeDelivered: true,
      enabled: false,
    })
  })

  it('汇总动作提交的是填的发送时间', async () => {
    const wrapper = mountDialog({
      name: '每天汇总',
      triggerType: 'digest',
      cron: '0 9 * * *',
      channelId: 'c4',
    })
    await flushPromises()
    await click(submit())
    const values = wrapper.emitted('submit')![0]![0] as { cron: string | null }
    expect(values.cron).toBe('0 9 * * *')
  })

  it('消息模板第一项是系统内置，选它交出去的是 null', async () => {
    const wrapper = mountDialog({ name: '用默认模板', channelId: 'c1', templateId: '' })
    await flushPromises()
    await openMenu('action-dialog-template')
    expect(document.body.textContent).toContain('系统内置（默认模板）')
    expect(document.body.textContent).toContain('默认模板')
    expect(document.body.textContent).toContain('简报模板')

    await click(submit())
    expect(
      (wrapper.emitted('submit')![0]![0] as { templateId: string | null }).templateId,
    ).toBeNull()
  })

  it('名称和通知渠道都是必填，缺一个保存就不可点', async () => {
    mountDialog({ channelId: 'c1' })
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: '有名字没渠道' })
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: '两样都有', channelId: 'c1' })
    await flushPromises()
    expect(submit().disabled).toBe(false)
  })

  it('汇总时间的表达式不合法时不让保存', async () => {
    mountDialog({ name: '汇总', channelId: 'c1', triggerType: 'digest', cron: '0 9 *' })
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: '汇总', channelId: 'c1', triggerType: 'digest', cron: '0 9 * * *' })
    await flushPromises()
    expect(submit().disabled).toBe(false)
  })

  it('触发方式按枚举给选项，两个开关的文案是短句', async () => {
    mountDialog({ name: '看选项', channelId: 'c1', triggerType: 'digest' })
    await flushPromises()
    expect(q('action-dialog-trigger')?.textContent).toContain('每天汇总')
    await openMenu('action-dialog-trigger')
    expect(document.body.textContent).toContain('采集到就投递')
    expect(document.body.textContent).toContain('每天汇总')

    const grid = document.querySelector('.action-dialog__grid')
    for (const test of ['action-dialog-merge', 'action-dialog-include-delivered']) {
      expect(grid?.querySelector(`[data-test="${test}"]`)).toBeTruthy()
    }
    expect(document.body.textContent).toContain('合并为一条消息')
    expect(document.body.textContent).toContain('包含已即时投递过的内容')
  })

  it('桌面两列：开关与发送时间跨满两列，名称/触发方式、渠道/模板成对', async () => {
    mountDialog({ name: '排一下', channelId: 'c1', triggerType: 'digest' })
    await flushPromises()

    const grid = document.querySelector('.action-dialog__grid')
    expect(grid).toBeTruthy()

    const isWide = (test: string): boolean => {
      const el = document.querySelector(`[data-test="${test}"]`) as HTMLElement | null
      return !!el?.closest('.action-dialog__wide')
    }
    for (const test of [
      'action-dialog-enabled',
      'action-dialog-cron',
      'action-dialog-include-delivered',
    ])
      expect(isWide(test), `整行字段 ${test}`).toBe(true)

    for (const test of [
      'action-dialog-name',
      'action-dialog-trigger',
      'action-dialog-channel',
      'action-dialog-template',
    ])
      expect(isWide(test), `成对字段 ${test}`).toBe(false)
  })

  it('这次没保存的输入不会留到下次打开', async () => {
    const wrapper = mountDialog({ name: '实时推送', channelId: 'c1' })
    await flushPromises()
    input('action-dialog-name').value = '改了一半'
    input('action-dialog-name').dispatchEvent(new Event('input'))
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(input('action-dialog-name').value).toBe('实时推送')
  })

  it('渠道下拉：标出渠道类型与未启用，末尾一个「新建通知渠道」', async () => {
    const wrapper = mountDialog({ name: '看渠道', channelId: 'c1' })
    await flushPromises()
    q('action-dialog-channel')?.click()
    await flushPromises()

    const menu = document.querySelector('.k2-menu')
    const items = [...(menu?.querySelectorAll('.k2-menu__item') ?? [])]
    expect(items.map((el) => el.textContent.trim().replace(/\s+/g, ' '))).toEqual([
      '我的 Telegram',
      '停用的 Webhook 未启用',
      '新建通知渠道',
    ])

    // 类型图标：telegram → mdi-send、webhook → mdi-webhook
    // （v-icon 用字体连字，名字在 class 上，不在文字里）
    expect(items[0]?.querySelector('.v-icon')?.className).toContain('mdi-send')
    expect(items[1]?.querySelector('.v-icon')?.className).toContain('mdi-webhook')

    // 停用的那个才有「未启用」
    const off = document.querySelectorAll('[data-test="action-dialog-channel-off"]')
    expect(off).toHaveLength(1)
    expect(off[0]?.textContent.trim()).toBe('未启用')
    expect(items[1]?.contains(off[0] as Node)).toBe(true)

    // 末尾那条是「去别处做事」，不选中任何渠道；点它只发事件，怎么开由页面定
    const add = q('action-dialog-new-channel')
    expect(add?.classList.contains('k2-menu__item--accent')).toBe(true)
    add?.click()
    await flushPromises()
    expect(wrapper.emitted('new-channel')).toBeTruthy()
  })
})
