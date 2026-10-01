import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import FormDialog from '@/components/biz/FormDialog.vue'
import AppDialog from '@/components/app/AppDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountDialog(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(FormDialog, {
    props: { modelValue: true, title: '新建渠道', ...props },
    slots: { default: '<div data-test="body">字段</div>', ...slots },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

const body = (): HTMLElement => document.body

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FormDialog', () => {
  it('标题、说明、默认的取消与保存都在', async () => {
    mountDialog({ note: '填完记得保存' })
    await flushPromises()
    expect(body().querySelector('[data-test="app-dialog"]')).toBeTruthy()
    expect(body().textContent).toContain('新建渠道')
    expect(body().textContent).toContain('填完记得保存')
    expect(body().querySelector('[data-test="form-dialog-cancel"]')).toBeTruthy()
    expect(body().querySelector('[data-test="form-dialog-submit"]')).toBeTruthy()
    expect(body().querySelector('[data-test="body"]')).toBeTruthy()
  })

  it('点保存抛 submit，点取消抛 cancel 并关掉自己', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    ;(body().querySelector('[data-test="form-dialog-submit"]') as HTMLElement).click()
    await flushPromises()
    expect(wrapper.emitted('submit')).toHaveLength(1)
    ;(body().querySelector('[data-test="form-dialog-cancel"]') as HTMLElement).click()
    await flushPromises()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates[updates.length - 1]).toEqual([false])
  })

  it('保存中：主按钮转圈、取消锁住', async () => {
    mountDialog({ busy: true })
    await flushPromises()
    expect(body().querySelector('[data-test="form-dialog-submit"] .app-spinner')).toBeTruthy()
    expect(
      (body().querySelector('[data-test="form-dialog-cancel"]') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('没填完可以只禁用主按钮', async () => {
    mountDialog({ submitDisabled: true })
    await flushPromises()
    expect(
      (body().querySelector('[data-test="form-dialog-submit"]') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('错误信息交给弹窗的错误条显示', () => {
    const wrapper = mountDialog({ error: '服务器返回 500' })
    expect(wrapper.findComponent(AppDialog).props('error')).toBe('服务器返回 500')
  })

  it('只读弹窗可以不显示保存按钮，主按钮文案也能换', async () => {
    mountDialog({ hideSubmit: true })
    await flushPromises()
    expect(body().querySelector('[data-test="form-dialog-submit"]')).toBeNull()
    document.body.innerHTML = ''
    mountDialog({ submitLabel: '创建' })
    await flushPromises()
    expect(body().querySelector('[data-test="form-dialog-submit"]')?.textContent?.trim()).toBe(
      '创建',
    )
  })
})
