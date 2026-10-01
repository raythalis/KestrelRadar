import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { VSelect } from 'vuetify/components'

import vuetify from '@/plugins/vuetify'
import AppSelect from '@/components/app/AppSelect.vue'

const items = [
  { title: '自带算法', value: 'standard' },
  { title: '灰区交给模型复核', value: 'assisted' },
]

function mountSelect(props: Record<string, unknown> = {}) {
  return mount(AppSelect, {
    props: { items, modelValue: 'standard', ...props },
    global: { plugins: [vuetify] },
  })
}

describe('AppSelect', () => {
  it('渲染标签，并把选项与当前值交给内部控件', () => {
    const wrapper = mountSelect({ label: '判定模式' })
    expect(wrapper.get('.app-field__label').text()).toBe('判定模式')
    const select = wrapper.findComponent(VSelect)
    expect(select.props('items')).toEqual(items)
    expect(select.props('modelValue')).toBe('standard')
    expect(select.props('error')).toBe(false)
  })

  it('disabled / readonly / error 会传给内部控件', () => {
    expect(mountSelect({ disabled: true }).findComponent(VSelect).props('disabled')).toBe(true)
    expect(mountSelect({ readonly: true }).findComponent(VSelect).props('readonly')).toBe(true)
    expect(mountSelect({ error: '必选' }).findComponent(VSelect).props('error')).toBe(true)
  })

  it('错误信息替换说明文字', () => {
    const wrapper = mountSelect({ hint: '提示', error: '必选' })
    expect(wrapper.get('.app-field__error').text()).toBe('必选')
    expect(wrapper.find('.app-field__hint').exists()).toBe(false)
  })
})
