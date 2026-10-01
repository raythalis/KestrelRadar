import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppHint from '@/components/app/AppHint.vue'

describe('AppHint', () => {
  it('四种语气各有类名，默认 info', () => {
    expect(mount(AppHint, { slots: { default: '说明' } }).classes()).toContain('app-hint--info')
    for (const tone of ['ok', 'warn', 'err'] as const) {
      expect(mount(AppHint, { props: { tone }, slots: { default: 'x' } }).classes()).toContain(
        `app-hint--${tone}`,
      )
    }
  })

  it('是无障碍可读的状态区域', () => {
    expect(mount(AppHint, { slots: { default: '保存成功' } }).attributes('role')).toBe('status')
  })
})
