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
  return wrapper.find('[data-test="cron-input"]').trigger('click')
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('CronPicker', () => {
  it('表达式进输入框；合规时字段下面不写任何解释', () => {
    const wrapper = mountPicker()
    const input = wrapper.find('[data-test="cron-input"]')
    expect((input.element as HTMLInputElement).value).toBe('0 8 * * *')
    expect(wrapper.find('[data-test="cron-error"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('按原样运行')
    expect(wrapper.text()).not.toContain('不常见')
  })

  it('段数不够：字段下面只给一句报错', () => {
    const wrapper = mountPicker({ modelValue: '0 8 * *' })
    const error = wrapper.find('[data-test="cron-error"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('五段')
    expect(error.classes().join(' ')).toContain('err')
  })

  it('写不出来：字段下面同样只给一句报错', () => {
    const wrapper = mountPicker({ modelValue: '0 8 x * *' })
    const error = wrapper.find('[data-test="cron-error"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('读不出来')
  })

  it('外部传进来的 error 以外部为准', () => {
    const wrapper = mountPicker({ error: '后端不认这段表达式' })
    expect(wrapper.find('[data-test="cron-error"]').text()).toBe('后端不认这段表达式')
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
