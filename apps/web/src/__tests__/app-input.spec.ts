import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import vuetify from '@/plugins/vuetify'
import AppInput from '@/components/app/AppInput.vue'

function mountInput(props: Record<string, unknown> = {}) {
  return mount(AppInput, {
    props: { modelValue: '', ...props },
    global: { plugins: [vuetify] },
  })
}

describe('AppInput', () => {
  it('标签、说明与必填标记', () => {
    const wrapper = mountInput({ label: 'RSSHub 地址', hint: '只填实例根地址', required: true })
    expect(wrapper.get('.app-field__label').text()).toContain('RSSHub 地址')
    expect(wrapper.get('.app-field__req').text()).toBe('*')
    expect(wrapper.get('.app-field__hint').text()).toBe('只填实例根地址')
  })

  it('有错误时显示错误信息并占掉说明的位置', () => {
    const wrapper = mountInput({ hint: '提示', error: '地址填错了' })
    expect(wrapper.get('.app-field__error').text()).toBe('地址填错了')
    expect(wrapper.find('.app-field__hint').exists()).toBe(false)
  })

  it('disabled / readonly 传给内部输入框', () => {
    expect(mountInput({ disabled: true }).get('input').attributes('disabled')).toBeDefined()
    expect(mountInput({ readonly: true }).get('input').attributes('readonly')).toBeDefined()
  })

  it('输入会更新 modelValue', async () => {
    const wrapper = mountInput()
    await wrapper.get('input').setValue('http://192.168.5.100:1200')
    const emitted = wrapper.emitted('update:modelValue') ?? []
    expect(emitted[emitted.length - 1]).toEqual(['http://192.168.5.100:1200'])
  })

  it('带动作按钮时（试抓这类）点它会把 action 抛出去', async () => {
    const wrapper = mountInput({ modelValue: 'x', actionLabel: '试抓' })
    const action = wrapper.findAll('button').find((b) => b.text().includes('试抓'))
    expect(action).toBeTruthy()
    await action!.trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })
})
