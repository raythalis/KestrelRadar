import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TagsField from '@/components/biz/TagsField.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

function mountField(props: Record<string, unknown> = {}) {
  return mount(TagsField, {
    props: { modelValue: [], ...props },
    global: { plugins: [vuetify, i18n] },
  })
}

describe('TagsField 的个数与长度上限', () => {
  it('常态说明后面挂着「已用 / 上限」', () => {
    const wrapper = mountField({ modelValue: ['a', 'b'], max: 10, hint: '用逗号分隔' })
    expect(wrapper.text()).toContain('2/10')
    expect(wrapper.text()).toContain('用逗号分隔')
  })

  it('单项超长就不收，并说一句', async () => {
    const wrapper = mountField({ modelValue: [] })
    await wrapper.find('input').setValue(`${'x'.repeat(101)} `)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('[data-test="tags-notice"]').text()).toContain('100')
  })

  it('到上限就停手：多的不收，输入框也停用', async () => {
    const wrapper = mountField({ modelValue: ['a', 'b'], max: 3 })
    await wrapper.find('input').setValue('c d ')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a', 'b', 'c']])
    expect(wrapper.find('[data-test="tags-notice"]').text()).toContain('3')

    const full = mountField({ modelValue: ['a', 'b', 'c'], max: 3 })
    expect((full.find('input').element as HTMLInputElement).disabled).toBe(true)
  })

  it('重复的词不重复收，正常输入照旧发出去', async () => {
    const wrapper = mountField({ modelValue: ['a'] })
    await wrapper.find('input').setValue('a b')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a', 'b']])
  })
})
