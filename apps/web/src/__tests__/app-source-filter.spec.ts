import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import AppSourceFilter from '@/components/app/AppSourceFilter.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import vuetifyGlobals from '@/plugins/vuetify-globals'

const OPTIONS = [
  { name: '全部来源', count: 6 },
  { name: '少数派', count: 2 },
]

const mounted: Array<{ unmount: () => void }> = []

function mountFilter(props: Record<string, unknown> = {}, attach = true) {
  const wrapper = mount(AppSourceFilter, {
    props: { options: OPTIONS, modelValue: '全部来源', ...props },
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

describe('AppSourceFilter', () => {
  it('没选具体来源时按钮就叫「筛选」', () => {
    const wrapper = mountFilter({}, false)
    expect(wrapper.find('[data-test="app-source-filter-trigger"]').text()).toContain('筛选')
    expect(wrapper.find('[data-test="app-source-filter-trigger"]').classes()).not.toContain(
      'k2-panel__quiet--on',
    )
  })

  it('选了来源后按钮显示来源名并进选中态', () => {
    const wrapper = mountFilter({ modelValue: '少数派' }, false)
    const trigger = wrapper.find('[data-test="app-source-filter-trigger"]')
    expect(trigger.text()).toContain('少数派')
    expect(trigger.classes()).toContain('k2-panel__quiet--on')
  })

  it('点开浮层：选项带条数，点一项抛 update:modelValue', async () => {
    const wrapper = mountFilter()
    await wrapper.find('[data-test="app-source-filter-trigger"]').trigger('click')
    await flushPromises()

    const options = [...document.querySelectorAll('[data-test="app-source-filter-option"]')]
    expect(options).toHaveLength(2)
    expect(options[1]?.textContent).toContain('少数派')
    expect(options[1]?.textContent).toContain('2')

    await options[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['少数派'])
  })

  it('浮层里有重置', async () => {
    const wrapper = mountFilter()
    await wrapper.find('[data-test="app-source-filter-trigger"]').trigger('click')
    await flushPromises()
    await document
      .querySelector('[data-test="app-source-filter-reset"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('浮层右上角的关闭按钮能真的关掉浮层', async () => {
    const wrapper = mountFilter()
    const trigger = wrapper.find('[data-test="app-source-filter-trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await document
      .querySelector('[data-test="app-source-filter-close"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('选中项带选中态，其余不带', async () => {
    const wrapper = mountFilter({ modelValue: '少数派' })
    await wrapper.find('[data-test="app-source-filter-trigger"]').trigger('click')
    await flushPromises()
    const options = [...document.querySelectorAll('[data-test="app-source-filter-option"]')]
    expect(options[0]?.classList.contains('k2-pop__option--on')).toBe(false)
    expect(options[1]?.classList.contains('k2-pop__option--on')).toBe(true)
  })
})
