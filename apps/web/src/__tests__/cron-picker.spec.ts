import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CronPicker from '@/components/biz/CronPicker.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import vuetifyGlobals from '@/plugins/vuetify-globals'

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(CronPicker, {
    props: { modelValue: '0 8 * * *', label: '汇总时间', ...props },
    global: { plugins: [vuetify, vuetifyGlobals, i18n, appComponents] },
  })
}

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

  it('生成器入口在，手搓的小时网格已删干净', () => {
    const wrapper = mountPicker()
    expect(wrapper.find('[data-test="cron-builder"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cron-hours-toggle"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('选小时')
  })

  it('停用 / 只读时生成器入口点不动', () => {
    for (const props of [{ disabled: true }, { readonly: true }]) {
      const wrapper = mountPicker(props)
      expect(
        (wrapper.find('[data-test="cron-builder"]').element as HTMLButtonElement).disabled,
      ).toBe(true)
      wrapper.unmount()
    }
  })
})
