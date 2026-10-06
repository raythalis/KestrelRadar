import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppSkeleton from '@/components/app/AppSkeleton.vue'

describe('AppSkeleton', () => {
  it('text：三行文字骨架，宽度递减', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'text' } })
    expect(wrapper.findAll('.k2-skeleton--line')).toHaveLength(3)
  })

  it('card：标题 + 若干行 + 一块内容', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'card', rows: 2 } })
    expect(wrapper.findAll('.k2-skeleton--title')).toHaveLength(1)
    expect(wrapper.findAll('.k2-skeleton--line')).toHaveLength(2)
    expect(wrapper.findAll('.k2-skeleton--block')).toHaveLength(1)
  })

  it('list：每行一个圆点 + 两行文字', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'list', rows: 3 } })
    expect(wrapper.findAll('.k2-skeleton-row')).toHaveLength(3)
    expect(wrapper.findAll('.k2-skeleton--dot')).toHaveLength(3)
  })

  it('page：首屏骨架（标题 + 说明 + 两块内容）', () => {
    const wrapper = mount(AppSkeleton, { props: { variant: 'page' } })
    expect(wrapper.findAll('.k2-skeleton--block')).toHaveLength(2)
  })

  it('list：首列形态可切换（圆点默认 / 方块 / 无）', () => {
    const dot = mount(AppSkeleton, { props: { variant: 'list', rows: 2 } })
    expect(dot.findAll('.k2-skeleton--dot')).toHaveLength(2)
    expect(dot.findAll('.k2-skeleton--lead')).toHaveLength(0)

    const tile = mount(AppSkeleton, { props: { variant: 'list', rows: 2, leading: 'tile' } })
    expect(tile.findAll('.k2-skeleton--lead')).toHaveLength(2)
    expect(tile.findAll('.k2-skeleton--dot')).toHaveLength(0)

    const none = mount(AppSkeleton, { props: { variant: 'list', rows: 2, leading: 'none' } })
    expect(none.findAll('.k2-skeleton--dot')).toHaveLength(0)
    expect(none.findAll('.k2-skeleton--lead')).toHaveLength(0)
    expect(none.findAll('.k2-skeleton-row')).toHaveLength(2)
  })

  it('list：紧凑档用短粗副条，常规档保持两行细线', () => {
    const compact = mount(AppSkeleton, {
      props: { variant: 'list', rows: 3, density: 'compact' },
    })
    expect(compact.findAll('.k2-skeleton-row--compact')).toHaveLength(3)
    expect(compact.findAll('.k2-skeleton--sub')).toHaveLength(3)

    const normal = mount(AppSkeleton, { props: { variant: 'list', rows: 3 } })
    expect(normal.findAll('.k2-skeleton-row--compact')).toHaveLength(0)
    expect(normal.findAll('.k2-skeleton--sub')).toHaveLength(0)
  })

  it('card：blocks 追加方块组，默认 0 不渲染', () => {
    const none = mount(AppSkeleton, { props: { variant: 'card' } })
    expect(none.findAll('.k2-skeleton--cell')).toHaveLength(0)

    const three = mount(AppSkeleton, { props: { variant: 'card', blocks: 3 } })
    expect(three.findAll('.k2-skeleton--cell')).toHaveLength(3)
    expect(three.findAll('.k2-skeleton--block')).toHaveLength(1)
  })
})
