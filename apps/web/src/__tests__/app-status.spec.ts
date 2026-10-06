import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppStatus from '@/components/app/AppStatus.vue'

const TONE_CLASS: Record<string, string> = {
  ok: 'k2-t-success',
  warn: 'k2-t-warning',
  err: 'k2-t-danger',
  info: 'k2-t-info',
  neutral: 'k2-t-neutral',
}

function mountStatus(props: Record<string, unknown> = {}, text = '已连通') {
  return mount(AppStatus, { props, slots: { default: text } })
}

describe('AppStatus', () => {
  it('五种语义状态各有自己的类名（落在 V2 语气类上）', () => {
    for (const tone of ['ok', 'warn', 'err', 'info', 'neutral'] as const) {
      expect(mountStatus({ tone }).classes()).toContain(TONE_CLASS[tone])
    }
  })

  it('默认是中性态', () => {
    expect(mountStatus().classes()).toContain('k2-t-neutral')
  })

  it('busy 是进行中：挂 is-busy（点会闪）', () => {
    const wrapper = mountStatus({ busy: true }, '测试中…')
    expect(wrapper.classes()).toContain('is-busy')
  })

  it('不带动作时是普通 span，带 action 时是按钮并抛出 click', async () => {
    expect(mountStatus().element.tagName).toBe('SPAN')
    const wrapper = mountStatus({ action: true })
    expect(wrapper.element.tagName).toBe('BUTTON')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('soft 是柔底档：给卡片内的运行状态用；不带 soft 时是纯文字加点的轻量档', () => {
    expect(mountStatus({ tone: 'ok', soft: true }).classes()).toContain('k2-chip--soft')
    expect(mountStatus({ tone: 'ok' }).classes()).toContain('k2-chip--plain')
    expect(mountStatus({ tone: 'ok' }).classes()).not.toContain('k2-chip--soft')
  })

  it('语义色由 V2 语气类提供（点在圆点与文字上同色）', () => {
    const css = readFileSync(resolve(__dirname, '../styles/v2.scss'), 'utf-8')
    for (const tone of ['success', 'warning', 'danger', 'info', 'neutral'] as const) {
      const block = css.slice(css.indexOf(`.k2-t-${tone} {`))
      const body = block.slice(0, block.indexOf('}'))
      expect(body).toContain('--c-ink')
      expect(body).toContain('--c-soft')
    }
    const chip = css.slice(css.indexOf('.k2-chip {'))
    expect(chip.slice(0, chip.indexOf('}'))).toContain('var(--c-ink)')
  })

  it('可以不要状态点（纯文字徽标）', () => {
    expect(mountStatus().find('.k2-chip__dot').exists()).toBe(true)
    expect(mountStatus({ dot: false }).find('.k2-chip__dot').exists()).toBe(false)
  })
})
