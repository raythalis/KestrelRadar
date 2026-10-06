import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppTextarea from '@/components/app/AppTextarea.vue'

function mountField(props: Record<string, unknown> = {}, modelValue = '') {
  return mount(AppTextarea, { props: { modelValue, 'onUpdate:modelValue': () => {}, ...props } })
}

describe('AppTextarea', () => {
  it('标签与必填星号按入参渲染', () => {
    const wrapper = mountField({ label: '意图描述', required: true })
    expect(wrapper.get('.k2-field__label').text()).toContain('意图描述')
    expect(wrapper.find('.k2-field__req').exists()).toBe(true)
    expect(mountField({ label: '意图描述' }).find('.k2-field__req').exists()).toBe(false)
  })

  it('常态说明走 k2-field__hint', () => {
    const wrapper = mountField({ label: 'x', hint: '最多三行' })
    expect(wrapper.get('.k2-field__hint').text()).toBe('最多三行')
  })

  it('错误优先于说明，且描边转危险色', () => {
    const wrapper = mountField({ hint: '说明', error: '不能为空' })
    expect(wrapper.get('.k2-field__err').text()).toBe('不能为空')
    expect(wrapper.find('.k2-field__hint').exists()).toBe(false)
    expect(wrapper.get('.k2-textarea').classes()).toContain('k2-textarea--err')
  })

  it('没有错误时不挂危险色描边', () => {
    expect(mountField({ hint: '说明' }).get('.k2-textarea').classes()).not.toContain(
      'k2-textarea--err',
    )
  })

  it('多行语义：rows 与 maxlength 透传到原生 textarea', () => {
    const wrapper = mountField({ rows: 5, maxlength: 200 })
    const el = wrapper.get('textarea').element as HTMLTextAreaElement
    expect(el.rows).toBe(5)
    expect(el.getAttribute('maxlength')).toBe('200')
    expect(el.tagName).toBe('TEXTAREA')
  })

  it('disabled 与 readonly 分开表达', () => {
    expect(mountField({ disabled: true }).get('textarea').attributes('disabled')).toBeDefined()
    const ro = mountField({ readonly: true }).get('textarea')
    expect(ro.attributes('readonly')).toBeDefined()
    expect(ro.attributes('disabled')).toBeUndefined()
  })

  it('v-model 双向：输入时抛出 update:modelValue', async () => {
    const wrapper = mount(AppTextarea, { props: { modelValue: '' } })
    await wrapper.get('textarea').setValue('新的正文')
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['新的正文'])
  })
})
