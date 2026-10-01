import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppStatus from '@/components/app/AppStatus.vue'

function mountStatus(props: Record<string, unknown> = {}, text = '已连通') {
  return mount(AppStatus, { props, slots: { default: text } })
}

describe('AppStatus', () => {
  it('五种语义状态各有自己的类名', () => {
    for (const tone of ['ok', 'warn', 'err', 'info', 'neutral'] as const) {
      expect(mountStatus({ tone }).classes()).toContain(`app-status--${tone}`)
    }
  })

  it('默认是中性态', () => {
    expect(mountStatus().classes()).toContain('app-status--neutral')
  })

  it('busy 是进行中：类名换成 busy 且点会闪', () => {
    const wrapper = mountStatus({ busy: true }, '测试中…')
    expect(wrapper.classes()).toContain('app-status--busy')
  })

  it('不带动作时是普通 span，带 action 时是按钮并抛出 click', async () => {
    expect(mountStatus().element.tagName).toBe('SPAN')
    const wrapper = mountStatus({ action: true })
    expect(wrapper.element.tagName).toBe('BUTTON')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('可以不要状态点（纯文字徽标）', () => {
    expect(mountStatus().find('.app-status__dot').exists()).toBe(true)
    expect(mountStatus({ dot: false }).find('.app-status__dot').exists()).toBe(false)
  })
})
