import type { RecentEvent } from '@kestrel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import AppEventDialog from '@/components/app/AppEventDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import vuetifyGlobals from '@/plugins/vuetify-globals'

/** 弹窗内容被 teleport 到 body，所以断言都走 document */
function modal(): HTMLElement | null {
  return document.querySelector('[data-test="app-event-dialog"]')
}

function event(index: number, read = true): RecentEvent {
  return {
    id: `e${index}`,
    title: `事件 ${index}`,
    url: `https://example.com/${index}`,
    groupId: 'g1',
    groupName: '组',
    kind: 'rss',
    sources: [{ discoveryId: `d${index}`, name: `来源${index}`, url: null }],
    sourceCount: 1,
    sourceNames: [`来源${index}`],
    itemCount: 1,
    firstItemAt: '2026-10-07T08:00:00.000Z',
    lastItemAt: '2026-10-07T09:00:00.000Z',
    readAt: read ? '2026-10-07T09:30:00.000Z' : null,
  }
}

const mounted: Array<{ unmount: () => void }> = []

function mountDialog(props: Record<string, unknown> = {}) {
  const wrapper = mount(AppEventDialog, {
    props: { modelValue: true, events: [event(1), event(2, false)], ...props },
    attachTo: document.body,
    global: { plugins: [vuetify, vuetifyGlobals, i18n, appComponents] },
  })
  mounted.push(wrapper)
  return wrapper
}

function click(el: Element | null | undefined): Promise<void> {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return flushPromises()
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('AppEventDialog', () => {
  it('关着的时候不渲染内容', async () => {
    mountDialog({ modelValue: false })
    await flushPromises()
    expect(modal()).toBeNull()
  })

  it('列出全部事件，复用 EventRow（未读圆点也在）', async () => {
    mountDialog()
    await flushPromises()
    const box = modal()
    expect(box).not.toBeNull()
    expect(box?.textContent).toContain('全部事件')
    expect(box?.textContent).toContain('最多展示最近 20 条事件')
    expect(box?.querySelectorAll('[data-test="event-row"]')).toHaveLength(2)
    // 未读的那一条有圆点，已读的没有
    expect(box?.querySelectorAll('[data-test="event-unread"]')).toHaveLength(1)
  })

  it('点一行抛 open（页面据此记已读、同步外部列表）', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    const rows = [...document.querySelectorAll('[data-test="event-row"]')]
    await click(rows[1])
    expect(wrapper.emitted('open')?.[0]?.[0]).toMatchObject({ id: 'e2' })
  })

  it('工具条显示当前来源；不是「全部来源」时才有清除筛选', async () => {
    const all = mountDialog()
    await flushPromises()
    expect(modal()?.textContent).toContain('全部来源')
    expect(document.querySelector('[data-test="app-event-dialog-clear"]')).toBeNull()
    all.unmount()

    const filtered = mountDialog({ filterLabel: '少数派' })
    await flushPromises()
    expect(modal()?.textContent).toContain('少数派')
    const clear = document.querySelector('[data-test="app-event-dialog-clear"]')
    expect(clear).not.toBeNull()
    await click(clear)
    expect(filtered.emitted('clear-filter')).toHaveLength(1)
  })

  it('底部显示已展示条数，完成按钮关弹窗', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    expect(modal()?.textContent).toContain('已展示 2 条事件')
    const footButtons = [...(modal()?.querySelectorAll('.k2-modal__foot button') ?? [])]
    await click(footButtons.at(-1))
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('列表为空时给一句话，不是空白', async () => {
    mountDialog({ events: [] })
    await flushPromises()
    expect(modal()?.textContent).toContain('这一条来源下暂时没有事件')
  })
})
