import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LlmPlusTag from '@/components/biz/LlmPlusTag.vue'

describe('LlmPlusTag', () => {
  it('名字与星芒一起出：LLM+ 走成功色的 tone 类，图标名取自图标字体子集', () => {
    const wrapper = mount(LlmPlusTag)
    expect(wrapper.text()).toBe('LLM+')
    expect(wrapper.classes()).toContain('k2-t-success')
    expect(wrapper.find('.mdi').classes()).toContain('mdi-shimmer')
  })
})
