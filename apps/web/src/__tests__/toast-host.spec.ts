import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ToastHost from '@/components/biz/ToastHost.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import { useToastStore } from '@/stores/toast'

function mountHost() {
  return mount(ToastHost, { global: { plugins: [createPinia(), vuetify, i18n] } })
}

describe('Toast 浮层', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('push 一条就出现（危险语气挂 alert 角色），到点自己消失', async () => {
    const wrapper = mountHost()
    useToastStore().push('连不上后端（/api）', 'danger')
    await flushPromises()

    const toast = wrapper.get('[data-test="toast"]')
    expect(toast.text()).toContain('连不上后端')
    expect(toast.classes()).toContain('k2-t-danger')
    expect(toast.attributes('role')).toBe('alert')

    vi.advanceTimersByTime(8000)
    await flushPromises()
    expect(wrapper.find('[data-test="toast"]').exists()).toBe(false)
  })

  it('同一句话不重复弹：接口连着失败只提示一次', async () => {
    const wrapper = mountHost()
    const toast = useToastStore()
    toast.push('保存失败')
    toast.push('保存失败')
    await flushPromises()
    expect(wrapper.findAll('[data-test="toast"]')).toHaveLength(1)
  })

  it('最多挂三条，再来新的把最旧的挤掉', async () => {
    const wrapper = mountHost()
    const toast = useToastStore()
    for (const text of ['一', '二', '三', '四']) toast.push(text)
    await flushPromises()

    expect(wrapper.findAll('[data-test="toast-text"]').map((el) => el.text())).toEqual([
      '二',
      '三',
      '四',
    ])
  })

  it('点 × 立刻关掉，不用等倒计时', async () => {
    const wrapper = mountHost()
    useToastStore().push('这条手动关')
    await flushPromises()

    await wrapper.get('[data-test="toast-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="toast"]').exists()).toBe(false)
  })

  it('鼠标悬停暂停倒计时，移开接着走（不会提前消失，也不会永远留着）', async () => {
    const wrapper = mountHost()
    useToastStore().push('悬停看看', 'warning')
    await flushPromises()

    await wrapper.get('[data-test="toast"]').trigger('mouseenter')
    vi.advanceTimersByTime(20000)
    await flushPromises()
    expect(wrapper.find('[data-test="toast"]').exists()).toBe(true)

    await wrapper.get('[data-test="toast"]').trigger('mouseleave')
    vi.advanceTimersByTime(5000)
    await flushPromises()
    expect(wrapper.find('[data-test="toast"]').exists()).toBe(false)
  })

  it('空文案不弹（接口回来的 message 可能是空串）', async () => {
    const wrapper = mountHost()
    useToastStore().push('   ')
    await flushPromises()
    expect(wrapper.find('[data-test="toast"]').exists()).toBe(false)
  })
})
