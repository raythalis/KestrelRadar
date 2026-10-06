import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import vuetify from '@/plugins/vuetify'
import AppButton from '@/components/app/AppButton.vue'

function mountButton(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AppButton, {
    props,
    slots: slots.default ? slots : { default: '保存' },
    global: { plugins: [vuetify] },
  })
}

describe('AppButton', () => {
  it('默认是次要按钮，六种变体各有自己的类名', () => {
    expect(mountButton().classes()).toContain('app-btn--secondary')
    expect(mountButton({ variant: 'primary' }).classes()).toContain('app-btn--primary')
    expect(mountButton({ variant: 'soft' }).classes()).toContain('app-btn--soft')
    expect(mountButton({ variant: 'ghost' }).classes()).toContain('app-btn--ghost')
    expect(mountButton({ variant: 'danger' }).classes()).toContain('app-btn--danger')
    expect(mountButton({ variant: 'danger-solid' }).classes()).toContain('app-btn--danger-solid')
  })

  it('小号、撑满宽度是可选项', () => {
    expect(mountButton().classes()).not.toContain('app-btn--sm')
    expect(mountButton({ size: 'sm' }).classes()).toContain('app-btn--sm')
    expect(mountButton({ block: true }).classes()).toContain('app-btn--block')
  })

  it('disabled 时不触发点击', async () => {
    const wrapper = mountButton({ disabled: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('loading 时显示转圈、标记 aria-busy 并禁止再点（防重复提交）', async () => {
    const wrapper = mountButton({ loading: true })
    expect(wrapper.find('.app-spinner').exists()).toBe(true)
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    // 加载中不打 disabled（否则会跟真禁用一样变灰）：用 aria-disabled + 点击守卫挡住重复提交
    expect(wrapper.get('button').attributes('aria-disabled')).toBe('true')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('禁用是去色（不保留品牌蓝），加载中保留主色', () => {
    const scss = readFileSync(resolve(process.cwd(), 'src/styles/components.scss'), 'utf8')
    expect(scss).toMatch(/\.app-btn:disabled\s*\{[^}]*filter:\s*grayscale\(1\)/s)
    expect(scss).toMatch(/\.app-btn\.is-loading\s*\{[^}]*opacity:\s*1/s)
  })

  it('加载中带 is-loading，但样式上不跟真禁用一样变灰', () => {
    const wrapper = mountButton({ loading: true })
    expect(wrapper.classes()).toContain('is-loading')
    const scss = readFileSync(resolve(process.cwd(), 'src/styles/components.scss'), 'utf8')
    expect(scss).toMatch(/\.app-btn\.is-loading\s*\{[^}]*opacity:\s*1/s)
    expect(scss).not.toMatch(/\.app-btn\[aria-disabled='true'\]\s*\{[^}]*opacity/s)
  })

  it('正常状态点击会把事件抛出去', async () => {
    const wrapper = mountButton()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
