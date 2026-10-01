import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import vuetify from '@/plugins/vuetify'
import AppSwitch from '@/components/app/AppSwitch.vue'

function mountSwitch(props: Record<string, unknown> = {}) {
  return mount(AppSwitch, {
    props: { modelValue: false, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('AppSwitch', () => {
  it('on / off 跟着 modelValue 走', async () => {
    const off = mountSwitch()
    expect(off.get('input').element.checked).toBe(false)
    const on = mountSwitch({ modelValue: true })
    expect(on.get('input').element.checked).toBe(true)
  })

  it('标签与说明', () => {
    const wrapper = mountSwitch({ label: '启用这个分组', hint: '关掉后不再采集' })
    expect(wrapper.text()).toContain('启用这个分组')
    expect(wrapper.text()).toContain('关掉后不再采集')
  })

  it('满足触摸目标：整行至少 44px 高（用行高类保证）', () => {
    const wrapper = mountSwitch({ label: 'x' })
    expect(wrapper.classes()).toContain('app-switch-row')
  })

  it('disabled 时控件不可点并置灰', () => {
    const wrapper = mountSwitch({ disabled: true })
    expect(wrapper.classes()).toContain('is-disabled')
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })
})
