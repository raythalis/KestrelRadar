import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容 teleport 到 body，挂上去以后直接查 document 才拿得到真实渲染结果
function mountConfirm(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(ConfirmDialog, {
    props: {
      modelValue: true,
      title: '删除渠道',
      message: '要删掉渠道「我的 Telegram」吗？',
      ...props,
    },
    slots,
    global: { plugins: [vuetify, i18n] },
  })
}

const dialog = () => document.querySelector('[data-test="app-dialog"]')
const ok = () => document.querySelector('[data-test="confirm-ok"]')
const cancel = () => document.querySelector('[data-test="confirm-cancel"]')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ConfirmDialog', () => {
  it('确认是实心危险按钮、取消是描边按钮，并写清删什么', async () => {
    mountConfirm({ confirmLabel: '删除分组' })
    await flushPromises()
    expect(ok()?.className).toContain('k2-btn--danger')
    expect(cancel()?.className).toContain('k2-btn--ghost')
    expect(ok()?.textContent?.trim()).toBe('删除分组')
  })

  it('给了 details 就按「将删除 / 将保留」两块列出来，对象名走错误色', async () => {
    mountConfirm({
      message: undefined,
      details: { name: 'AI 圈', counts: { discoveries: 2, monitors: 1, actions: 0 } },
    })
    await flushPromises()
    const lead = document.querySelector('[data-test="confirm-lead"]')
    expect(lead?.textContent).toContain('AI 圈')
    expect(lead?.querySelector('.k2-dialog__subject')).not.toBeNull()
    const removed = document.querySelector('[data-test="confirm-remove-list"]')?.textContent ?? ''
    expect(removed).toContain('2')
    expect(removed).toContain('发现')
    expect(document.querySelector('[data-test="confirm-keep-list"]')?.textContent).toContain('事件')
    expect(document.querySelector('[data-test="confirm-question"]')).not.toBeNull()
    // 有清单时不再重复那句纯文本说明
    expect(document.querySelector('[data-test="confirm-message"]')).toBeNull()
  })

  it('后果说明显示在弹窗里，取消文案用通用「取消」', async () => {
    mountConfirm()
    await flushPromises()
    expect(document.querySelector('[data-test="confirm-message"]')?.textContent).toContain(
      '我的 Telegram',
    )
    expect(cancel()?.textContent?.trim()).toBe('取消')
  })

  it('点确认才出 confirm 事件；点取消只关窗、不删东西', async () => {
    const wrapper = mountConfirm()
    await flushPromises()

    ;(cancel() as HTMLElement).click()
    await flushPromises()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    const updates = wrapper.emitted('update:modelValue') as boolean[][] | undefined
    expect(updates?.[updates.length - 1]).toEqual([false])
  })

  it('删除进行中：确认按钮转圈、两个按钮都点不动、遮罩与 Esc 也关不掉', async () => {
    const wrapper = mountConfirm({ busy: true })
    await flushPromises()

    expect(ok()?.querySelector('.k2-spin')).not.toBeNull()
    expect((cancel() as HTMLButtonElement).disabled).toBe(true)

    // busy 时弹窗是 persistent：点遮罩不关
    expect(wrapper.findComponent({ name: 'VDialog' }).props('persistent')).toBe(true)

    ;(ok() as HTMLElement).click()
    await flushPromises()
    // 转圈期间点击不出事件，避免重复删除
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('删除失败时错误显示在弹窗里', async () => {
    mountConfirm({ error: '服务器返回 500' })
    await flushPromises()
    expect(document.querySelector('[data-test="app-dialog-error"]')?.textContent).toContain('500')
  })

  it('关掉时什么都不渲染', async () => {
    mountConfirm({ modelValue: false })
    await flushPromises()
    expect(dialog()).toBeNull()
  })
})
