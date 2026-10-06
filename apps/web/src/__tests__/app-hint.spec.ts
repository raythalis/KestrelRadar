import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppHint from '@/components/app/AppHint.vue'

describe('AppHint', () => {
  it('四种语气各有类名，默认 info', () => {
    expect(mount(AppHint, { slots: { default: '说明' } }).classes()).toContain('k2-t-info')
    for (const tone of ['ok', 'warn', 'err'] as const) {
      const TONE_CLASS: Record<string, string> = {
        info: 'k2-t-info',
        ok: 'k2-t-success',
        warn: 'k2-t-warning',
        err: 'k2-t-danger',
      }
      expect(mount(AppHint, { props: { tone }, slots: { default: 'x' } }).classes()).toContain(
        TONE_CLASS[tone],
      )
    }
  })

  it('是无障碍可读的状态区域', () => {
    expect(mount(AppHint, { slots: { default: '保存成功' } }).attributes('role')).toBe('status')
  })
})
