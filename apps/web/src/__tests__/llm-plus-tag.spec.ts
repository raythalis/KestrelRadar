import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LlmPlusTag from '@/components/biz/LlmPlusTag.vue'

describe('LlmPlusTag', () => {
  it('名字与星芒一起出；颜色交给 .k2-llmplus（success 本色），图标名取自字体子集', () => {
    const wrapper = mount(LlmPlusTag)
    expect(wrapper.text()).toBe('LLM+')
    expect(wrapper.classes()).toContain('k2-llmplus')
    expect(wrapper.find('.mdi').classes()).toContain('mdi-shimmer')
  })
})
