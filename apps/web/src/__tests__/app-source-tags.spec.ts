import type { EventSourceRef } from '@kestrel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import AppSourceTags from '@/components/app/AppSourceTags.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import vuetifyGlobals from '@/plugins/vuetify-globals'

function source(
  index: number,
  url: string | null = `https://example.com/${index}`,
): EventSourceRef {
  return { discoveryId: `d${index}`, name: `来源${index}`, url }
}

/** 浮层会被 teleport 到 body，断言去 document.body 里找；要挂到页面上才有这个行为 */
const mounted: Array<{ unmount: () => void }> = []

/** 组件实际收的 props（照 <script setup> 的声明写，别用宽泛的 Record） */
type TagsProps = {
  sources: EventSourceRef[]
  total?: number
  limit?: number
  rest?: EventSourceRef[]
}

function mountTags(props: TagsProps, attach = true) {
  const wrapper = mount(AppSourceTags, {
    props,
    attachTo: attach ? document.body : undefined,
    global: { plugins: [vuetify, vuetifyGlobals, i18n, appComponents] },
  })
  if (attach) mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('AppSourceTags', () => {
  it('两个以内全挂出来，每个直接指向那家的原文', () => {
    const wrapper = mountTags({ sources: [source(1), source(2)], total: 2 }, false)
    const tags = wrapper.findAll('.k2-chip--tag')
    expect(tags).toHaveLength(2)
    expect(tags[0]?.attributes('href')).toBe('https://example.com/1')
    expect(tags[0]?.attributes('target')).toBe('_blank')
    expect(wrapper.find('[data-test="app-source-tags-more"]').exists()).toBe(false)
  })

  it('超过两个的收成一个 +N，不跳转', () => {
    const wrapper = mountTags({ sources: [source(1), source(2)], total: 4 }, false)
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(3)
    const more = wrapper.find('[data-test="app-source-tags-more"]')
    expect(more.text()).toBe('+2')
    expect(more.attributes('href')).toBeUndefined()
  })

  it('点 +N 打开浮层：完整来源都列在里面，每条带自己的链接', async () => {
    const rest = [source(3), source(4)]
    const wrapper = mountTags({ sources: [source(1), source(2)], total: 4, rest })
    await wrapper.find('[data-test="app-source-tags-more"]').trigger('click')
    await flushPromises()

    const pop = document.body.querySelector('.k2-pop--sources')
    expect(pop).not.toBeNull()
    const items = [...document.querySelectorAll('[data-test="app-source-tags-list"] .k2-pop__item')]
    expect(items).toHaveLength(4)
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      '来源1',
      '来源2',
      '来源3',
      '来源4',
    ])
    expect(items[3]?.getAttribute('href')).toBe('https://example.com/4')
    // 行本身没被撑开：标签数不变
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(3)
  })

  it('还没取回其余来源时，点 +N 只抛 more，让页面去取', async () => {
    const wrapper = mountTags({ sources: [source(1), source(2)], total: 4 })
    await wrapper.find('[data-test="app-source-tags-more"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('more')).toHaveLength(1)
    const items = [...document.querySelectorAll('[data-test="app-source-tags-list"] .k2-pop__item')]
    expect(items).toHaveLength(2)
  })

  it('limit 可调：只挂一个时 +N 把剩下的都算上', () => {
    const wrapper = mountTags(
      { sources: [source(1), source(2), source(3)], total: 3, limit: 1 },
      false,
    )
    expect(wrapper.findAll('.k2-chip--tag')).toHaveLength(2)
    expect(wrapper.find('[data-test="app-source-tags-more"]').text()).toBe('+2')
  })

  it('来源没有链接时挂成不可点的标签', () => {
    const wrapper = mountTags({ sources: [source(1, null)], total: 1 }, false)
    expect(wrapper.find('.k2-chip--tag').attributes('href')).toBeUndefined()
  })
})
