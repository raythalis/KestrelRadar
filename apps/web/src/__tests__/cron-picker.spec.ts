import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { CronVuetify } from '@vue-js-cron/vuetify'

import CronPicker from '@/components/biz/CronPicker.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import vuetifyGlobals from '@/plugins/vuetify-globals'

/** 浮层会被 teleport 到 body，所以断言去 document.body 里找；要挂到页面上才有这个行为 */
const mounted: Array<{ unmount: () => void }> = []

function mountPicker(props: Record<string, unknown> = {}, attach = false) {
  const wrapper = mount(CronPicker, {
    props: { modelValue: '0 8 * * *', label: '汇总时间', ...props },
    attachTo: attach ? document.body : undefined,
    global: { plugins: [vuetify, vuetifyGlobals, i18n, appComponents] },
  })
  if (attach) mounted.push(wrapper)
  return wrapper
}

function openBuilder(wrapper: ReturnType<typeof mountPicker>) {
  return wrapper.find('[data-test="cron-input"] input').trigger('click')
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('CronPicker', () => {
  it('表达式进输入框，人话行说清时间', () => {
    const wrapper = mountPicker()
    const input = wrapper.find('[data-test="cron-input"] input')
    expect((input.element as HTMLInputElement).value).toBe('0 8 * * *')
    expect(wrapper.find('[data-test="cron-human"]').text()).toContain('每天 08:00')
  })

  it('每小时、多个整点、每周、每月都翻得出来', () => {
    expect(
      mountPicker({ modelValue: '30 * * * *' }).find('[data-test="cron-human"]').text(),
    ).toContain('每小时')
    expect(
      mountPicker({ modelValue: '0 8,20 * * *' }).find('[data-test="cron-human"]').text(),
    ).toContain('20:00')
    expect(
      mountPicker({ modelValue: '30 9 * * 1-5' }).find('[data-test="cron-human"]').text(),
    ).toContain('周')
    expect(
      mountPicker({ modelValue: '0 6 1 * *' }).find('[data-test="cron-human"]').text(),
    ).toContain('每月')
  })

  it('生成器产出的步长表达式，人话行也说得清', () => {
    expect(
      mountPicker({ modelValue: '*/10 * * * *' }).find('[data-test="cron-human"]').text(),
    ).toContain('每 10 分钟')
    expect(
      mountPicker({ modelValue: '0 */6 * * *' }).find('[data-test="cron-human"]').text(),
    ).toContain('每 6 小时')
  })

  it('看不懂的表达式给提醒色，写错的给错误色，都不装作没事', () => {
    const odd = mountPicker({ modelValue: '*/5 8 * * *' })
    expect(odd.find('[data-test="cron-human"]').classes().join(' ')).toContain('warn')

    const bad = mountPicker({ modelValue: '0 8 * *' })
    expect(bad.find('[data-test="cron-human"]').classes().join(' ')).toContain('err')
    expect(bad.find('[data-test="cron-human"]').text()).toContain('五段')
  })

  it('点输入框自己就展开生成器，不用再按按钮', async () => {
    const wrapper = mountPicker({}, true)

    await openBuilder(wrapper)
    await flushPromises()

    // 生成器是挂在字段下面的浮层：persistent 让它关掉也不从 DOM 里消失，
    // 所以"开没开"看激活元素的 aria-expanded，而不是看内容在不在
    expect(wrapper.find('[data-test="cron-input"]').attributes('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[data-test="cron-builder-body"]')).toBeTruthy()
    expect(wrapper.find('[data-test="cron-builder"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="cron-hours-toggle"]').exists()).toBe(false)
  })

  it('生成器跟着字段走：拿到的表达式是字段值，选完的回写成字段值', async () => {
    const wrapper = mountPicker({ modelValue: '0 8 * * *' }, true)
    await openBuilder(wrapper)
    await flushPromises()

    const builder = wrapper.findComponent(CronVuetify)
    expect(builder.exists()).toBe(true)
    expect(builder.props('modelValue')).toBe('0 8 * * *')

    builder.vm.$emit('update:modelValue', '0 9 * * *')
    await flushPromises()

    const written = wrapper.emitted('update:modelValue') ?? []
    expect(written[written.length - 1]).toEqual(['0 9 * * *'])
  })

  it('点浮层外面把它收起来', async () => {
    const wrapper = mountPicker({}, true)
    await openBuilder(wrapper)
    await flushPromises()
    expect(wrapper.find('[data-test="cron-input"]').attributes('aria-expanded')).toBe('true')

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()

    expect(wrapper.find('[data-test="cron-input"]').attributes('aria-expanded')).toBe('false')
  })

  it('停用 / 只读时点不开生成器', async () => {
    for (const props of [{ disabled: true }, { readonly: true }]) {
      const wrapper = mountPicker(props, true)
      await openBuilder(wrapper)
      await flushPromises()
      expect(wrapper.find('[data-test="cron-input"]').attributes('aria-expanded')).not.toBe('true')
      expect(wrapper.findComponent(CronVuetify).exists()).toBe(false)
    }
  })
})
