import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppInput from '@/components/app/AppInput.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 清空叉的无障碍名字走 i18n，挂载时要带 i18n 插件
function mountInput(props: Record<string, unknown> = {}) {
  return mount(AppInput, {
    props: { modelValue: '', ...props },
    global: { plugins: [vuetify, i18n] },
  })
}

const clearButton = (wrapper: ReturnType<typeof mountInput>) =>
  wrapper.findAll('button').find((b) => b.attributes('data-test') === 'app-input-clear')

describe('AppInput', () => {
  it('标签、说明与必填标记', () => {
    const wrapper = mountInput({ label: 'RSSHub 地址', hint: '只填实例根地址', required: true })
    expect(wrapper.get('.k2-field__label').text()).toContain('RSSHub 地址')
    expect(wrapper.get('.k2-field__req').text()).toBe('*')
    expect(wrapper.get('.k2-field__hint').text()).toBe('只填实例根地址')
  })

  it('有错误时显示错误信息并占掉说明的位置', () => {
    const wrapper = mountInput({ hint: '提示', error: '地址填错了' })
    expect(wrapper.get('.k2-field__err').text()).toBe('地址填错了')
    expect(wrapper.find('.k2-field__hint').exists()).toBe(false)
  })

  it('限长直接落在输入框上（后端也有上限，先拦住不让提交才报错）', () => {
    expect(mountInput({ maxlength: 60 }).get('input').attributes('maxlength')).toBe('60')
    expect(mountInput().get('input').attributes('maxlength')).toBeUndefined()
  })

  it('disabled / readonly 传给内部输入框', () => {
    expect(mountInput({ disabled: true }).get('input').attributes('disabled')).toBeDefined()
    expect(mountInput({ readonly: true }).get('input').attributes('readonly')).toBeDefined()
  })

  it('输入会更新 modelValue', async () => {
    const wrapper = mountInput()
    await wrapper.get('input').setValue('http://127.0.0.1:1200')
    const emitted = wrapper.emitted('update:modelValue') ?? []
    expect(emitted[emitted.length - 1]).toEqual(['http://127.0.0.1:1200'])
  })

  it('带动作按钮时（试抓这类）点它会把 action 抛出去', async () => {
    const wrapper = mountInput({ modelValue: 'x', actionLabel: '试抓' })
    const action = wrapper.findAll('button').find((b) => b.text().includes('试抓'))
    expect(action).toBeTruthy()
    await action!.trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('固定前缀只展示、不进值', () => {
    const wrapper = mountInput({
      modelValue: '/bilibili/ranking/all',
      prefix: 'http://127.0.0.1:1200',
    })
    expect(wrapper.get('.k2-inputgroup__prefix').text()).toBe('http://127.0.0.1:1200')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('/bilibili/ranking/all')
  })

  it('有内容才给清空叉，点它把值清空', async () => {
    expect(clearButton(mountInput())).toBeUndefined()

    const wrapper = mountInput({ modelValue: '鸭鸭' })
    expect(clearButton(wrapper)).toBeTruthy()
    // 有叉时给文字让出位置，别顶到叉下面
    expect(wrapper.get('.k2-inputwrap').classes()).toContain('is-clearable')

    await clearButton(wrapper)!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue') ?? []
    expect(emitted[emitted.length - 1]).toEqual([''])
  })

  it('禁用与只读不给清空叉', () => {
    expect(clearButton(mountInput({ modelValue: '鸭鸭', disabled: true }))).toBeUndefined()
    expect(clearButton(mountInput({ modelValue: '鸭鸭', readonly: true }))).toBeUndefined()
  })
})
