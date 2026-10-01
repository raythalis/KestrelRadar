import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSkeleton from '@/components/app/AppSkeleton.vue'

describe('AppSkeleton', () => {
  it('text：三行文字骨架，宽度递减', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'text' } })
    expect(wrapper.findAll('.app-skeleton--text')).toHaveLength(3)
  })

  it('card：标题 + 若干行 + 一块内容', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'card', rows: 2 } })
    expect(wrapper.findAll('.app-skeleton--title')).toHaveLength(1)
    expect(wrapper.findAll('.app-skeleton--text')).toHaveLength(2)
    expect(wrapper.findAll('.app-skeleton--block')).toHaveLength(1)
  })

  it('list：每行一个圆点 + 两行文字', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'list', rows: 3 } })
    expect(wrapper.findAll('.app-skeleton-row')).toHaveLength(3)
    expect(wrapper.findAll('.app-skeleton--dot')).toHaveLength(3)
  })

  it('page：首屏骨架（标题 + 说明 + 两块内容）', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'page' } })
    expect(wrapper.findAll('.app-skeleton--block')).toHaveLength(2)
  })
})
