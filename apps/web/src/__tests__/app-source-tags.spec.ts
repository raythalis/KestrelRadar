import type { EventSourceRef } from '@kestrel/contracts'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSourceTags from '@/components/app/AppSourceTags.vue'

function source(
  index: number,
  url: string | null = `https://example.com/${index}`,
): EventSourceRef {
  return { discoveryId: `d${index}`, name: `来源${index}`, url }
}

describe('AppSourceTags', () => {
  it('两个以内全挂出来，每个直接指向那家的原文', () => {
    const wrapper = mount(AppSourceTags, { props: { sources: [source(1), source(2)], total: 2 } })
    const tags = wrapper.findAll('.k2-chip--tag')
    expect(tags).toHaveLength(2)
    expect(tags[0].attributes('href')).toBe('https://example.com/1')
    expect(tags[0].attributes('target')).toBe('_blank')
    expect(wrapper.find('[data-test="app-source-tags-more"]').exists()).toBe(false)
  })

  it('超过两个的收成一个 +N，点了只抛 more，不跳转', async () => {
    const wrapper = mount(AppSourceTags, { props: { sources: [source(1), source(2)], total: 4 } })
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(3)
    const more = wrapper.find('[data-test="app-source-tags-more"]')
    expect(more.text()).toBe('+2')
    await more.trigger('click')
    expect(wrapper.emitted('more')).toHaveLength(1)
  })

  it('给了完整来源列表时，点 +N 就地展开，不抛 more', async () => {
    const rest = [source(3), source(4)]
    const wrapper = mount(AppSourceTags, {
      props: { sources: [source(1), source(2)], total: 4, rest },
    })
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(3)
    await wrapper.find('[data-test="app-source-tags-more"]').trigger('click')
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(4)
    expect(wrapper.text()).toContain('来源3')
    expect(wrapper.find('[data-test="app-source-tags-more"]').exists()).toBe(false)
    expect(wrapper.emitted('more')).toBeUndefined()
  })

  it('来源没有链接时挂成不可点的标签', () => {
    const wrapper = mount(AppSourceTags, { props: { sources: [source(1, null)], total: 1 } })
    const tag = wrapper.find('.k2-chip--tag')
    expect(tag.element.tagName).toBe('SPAN')
    expect(tag.attributes('href')).toBeUndefined()
  })

  it('limit 可调：只挂一个时 +N 把剩下的都算上', () => {
    const wrapper = mount(AppSourceTags, {
      props: { sources: [source(1), source(2)], total: 5, limit: 1 },
    })
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(2)
    expect(wrapper.find('[data-test="app-source-tags-more"]').text()).toBe('+4')
  })
})
