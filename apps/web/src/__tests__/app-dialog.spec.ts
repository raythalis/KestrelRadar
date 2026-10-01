import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { VDialog } from 'vuetify/components'

import AppDialog from '@/components/app/AppDialog.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容是 teleport 到 body 的：挂到 body 上再直接查 document，才拿得到真实渲染结果。
function mountDialog(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const wrapper = mount(AppDialog, {
    props: { modelValue: true, title: '新建分组', ...props },
    slots: { default: '<input />', footer: '<button>保存</button>', ...slots },
    global: { plugins: [vuetify, i18n] },
  })
  return { wrapper, attachTo: undefined }
}

const dialog = () => document.querySelector('[data-test="app-dialog"]')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AppDialog', () => {
  it('打开时渲染标题、内容与卡足操作', async () => {
    mountDialog()
    await flushPromises()
    expect(document.querySelector('.app-card__title')?.textContent).toBe('新建分组')
    expect(document.querySelector('.app-dialog input')).toBeTruthy()
    expect(document.querySelector('.app-dialog .app-card__foot')?.textContent).toContain('保存')
  })

  it('关掉时不渲染内容', async () => {
    mountDialog({ modelValue: false })
    await flushPromises()
    expect(dialog()).toBeNull()
  })

  it('loading 时盖住内容、显示处理中', async () => {
    mountDialog({ loading: true })
    await flushPromises()
    expect(document.querySelector('[data-test="app-dialog-loading"]')?.textContent).toContain(
      '处理中',
    )
    expect(document.querySelector('.app-dialog input')).toBeNull()
  })

  it('error 时错误条在内容上方，表单内容不被顶掉', async () => {
    mountDialog({ error: 'Telegram 返回 401' })
    await flushPromises()
    const banner = document.querySelector('[data-test="app-dialog-error"]')
    expect(banner?.textContent).toContain('401')
    // 报错不能把用户填的东西藏起来：错误条要在内容前面，内容照常渲染
    expect(document.querySelector('.app-dialog input')).not.toBeNull()
    const body = document.querySelector('.app-dialog .app-card__body')
    expect(body?.firstElementChild).toBe(banner)
  })

  it('窄屏用底部抽屉：默认带 sheet 类，特殊情况下可以关掉', () => {
    const withSheet = mount(AppDialog, {
      props: { modelValue: false, title: 'x' },
      global: { plugins: [vuetify, i18n] },
    })
    expect(withSheet.findComponent(VDialog).props('contentClass')).toBe('app-dialog__sheet')

    const withoutSheet = mount(AppDialog, {
      props: { modelValue: false, title: 'x', sheetOnMobile: false },
      global: { plugins: [vuetify, i18n] },
    })
    expect(withoutSheet.findComponent(VDialog).props('contentClass')).toBeUndefined()
  })

  it('关闭按钮把 modelValue 置为 false', async () => {
    const { wrapper } = mountDialog()
    await flushPromises()
    ;(document.querySelector('[data-test="app-dialog-close"]') as HTMLElement).click()
    await flushPromises()
    const emitted = wrapper.emitted('update:modelValue') ?? []
    expect(emitted[emitted.length - 1]).toEqual([false])
  })
})
