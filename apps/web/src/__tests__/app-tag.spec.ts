import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppTag from '@/components/app/AppTag.vue'

describe('AppTag', () => {
  it('默认是普通标签', () => {
    const wrapper = mount(AppTag, { slots: { default: 'RSSHub' } })
    expect(wrapper.classes()).toContain('app-tag')
    expect(wrapper.classes()).not.toContain('app-tag--accent')
    expect(wrapper.text()).toBe('RSSHub')
  })

  it('语气与等宽按需切换', () => {
    expect(mount(AppTag, { props: { tone: 'accent' } }).classes()).toContain('app-tag--accent')
    expect(mount(AppTag, { props: { tone: 'ok' } }).classes()).toContain('app-tag--ok')
    expect(mount(AppTag, { props: { tone: 'warn' } }).classes()).toContain('app-tag--warn')
    expect(mount(AppTag, { props: { tone: 'err' } }).classes()).toContain('app-tag--err')
    expect(mount(AppTag, { props: { mono: true } }).classes()).toContain('font-mono')
  })
})
