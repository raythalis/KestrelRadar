import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import SourceDialog from '@/components/biz/SourceDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容 teleport 到 body，挂上去以后直接查 document 才拿得到真实渲染结果
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(SourceDialog, {
    props: { modelValue: true, kind: 'rsshub', ...props },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

const q = (test: string): HTMLElement | null =>
  document.querySelector(`[data-test="${test}"]`) as HTMLElement | null
const input = (test: string): HTMLInputElement =>
  document.querySelector(`[data-test="${test}"] input`) as HTMLInputElement
const submit = (): HTMLButtonElement =>
  document.querySelector('[data-test="form-dialog-submit"]') as HTMLButtonElement
const click = async (el: HTMLElement | null): Promise<void> => {
  el?.click()
  await flushPromises()
}
/** 下拉浮层是 teleport 出来的；jsdom 里点不开 Vuetify 的 v-select，得按一下方向键 */
const openMenu = async (test: string): Promise<void> => {
  const el = input(test)
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushPromises()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SourceDialog', () => {
  it('打开时按入参填好，标题是新建还是编辑', async () => {
    mountDialog({ name: 'B 站排行', target: '/bilibili/ranking/all', cron: '*/30 * * * *' })
    await flushPromises()
    expect(input('source-dialog-name').value).toBe('B 站排行')
    expect(input('source-dialog-target').value).toBe('/bilibili/ranking/all')
    expect(document.body.textContent).toContain('编辑数据源')
  })

  it('类型在弹窗里选', async () => {
    mountDialog()
    await flushPromises()
    expect(document.body.textContent).toContain('新建数据源')
    expect(q('source-dialog-kind')).toBeTruthy()
  })

  it('地址栏的名称与例子按类型给：RSSHub 叫路由、RSS 叫订阅地址、网页叫网页地址', async () => {
    mountDialog()
    await flushPromises()
    expect(q('source-dialog-target')?.textContent).toContain('路由')
    expect(document.body.textContent).toContain('例如 /bilibili/ranking/all')

    document.body.innerHTML = ''
    mountDialog({ kind: 'rss' })
    await flushPromises()
    expect(q('source-dialog-target')?.textContent).toContain('订阅地址')
    expect(document.body.textContent).toContain('例如 https://example.com/feed.xml')

    document.body.innerHTML = ''
    mountDialog({ kind: 'web' })
    await flushPromises()
    expect(q('source-dialog-target')?.textContent).toContain('网页地址')
    expect(document.body.textContent).toContain('例如 https://example.com/news')
  })

  it('RSSHub 没配实例地址：这一项灰掉、点了也不换类型，右侧挂一个能点的「前往配置」', async () => {
    const wrapper = mountDialog({
      name: '有名字',
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      cron: '0 * * * *',
      rsshubBaseUrl: '',
    })
    await flushPromises()
    await openMenu('source-dialog-kind')
    const chip = q('source-dialog-rsshub-configure')
    expect(chip?.textContent).toContain('前往配置')
    // 整行走 Vuetify 的 disabled：不响应点击、不响应悬停，也不会把下拉关掉
    expect(document.querySelector('.v-list-item--disabled')).toBeTruthy()
    expect(chip?.closest('.v-list-item')?.className).toContain('source-dialog__kindrow--muted')

    await click(document.querySelector('.v-list-item'))
    await click(submit())
    expect((wrapper.emitted('submit')?.[0]?.[0] as { kind: string }).kind).toBe('rss')

    await click(chip)
    expect(wrapper.emitted('configureRsshub')).toBeTruthy()
  })

  it('RSSHub 配好了：这一项可选，也不出现「前往配置」', async () => {
    const wrapper = mountDialog({
      name: '有名字',
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      cron: '0 * * * *',
      rsshubBaseUrl: 'http://192.168.5.100:1200',
    })
    await flushPromises()
    await openMenu('source-dialog-kind')
    expect(q('source-dialog-rsshub-configure')).toBeNull()
    expect(document.querySelector('.v-list-item--disabled')).toBeNull()
    expect(q('source-dialog-kind-item')?.className).not.toContain('muted')

    await click(document.querySelector('.v-list-item'))
    await click(submit())
    expect((wrapper.emitted('submit')?.[0]?.[0] as { kind: string }).kind).toBe('rsshub')
  })

  it('RSSHub 模式下路由框前面挂实例地址前缀，前缀只展示不参与输入', async () => {
    mountDialog({
      kind: 'rsshub',
      target: '/bilibili/ranking/all',
      rsshubBaseUrl: 'http://192.168.5.100:1200/',
    })
    await flushPromises()
    const prefix = q('app-input-prefix')
    expect(prefix?.textContent).toBe('http://192.168.5.100:1200')
    expect(prefix?.querySelector('input')).toBeNull()
    expect(input('source-dialog-target').value).toBe('/bilibili/ranking/all')
  })

  it('别的种类不挂前缀', async () => {
    mountDialog({
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      rsshubBaseUrl: 'http://192.168.5.100:1200',
    })
    await flushPromises()
    expect(q('app-input-prefix')).toBeNull()
  })

  it('采集频率那一栏是 cron 字段，不另写人话翻译', async () => {
    mountDialog({ cron: '0 * * * *' })
    await flushPromises()
    expect(q('source-dialog-cron')).toBeTruthy()
    expect(input('source-dialog-cron').value).toBe('0 * * * *')
    expect(document.body.textContent).not.toContain('每小时')
  })

  it('提交时带上种类与四个字段', async () => {
    const wrapper = mountDialog({
      name: 'B 站排行',
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      cron: '0 * * * *',
    })
    await flushPromises()
    await click(submit())
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'B 站排行',
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      cronExpression: '0 * * * *',
      enabled: true,
    })
  })

  it('名称、地址、频率缺一个，保存就不可点', async () => {
    mountDialog()
    await flushPromises()
    expect(submit().disabled).toBe(true)

    document.body.innerHTML = ''
    mountDialog({ name: '有名字', kind: 'rss', target: 'https://example.com/feed.xml', cron: '' })
    await flushPromises()
    expect(submit().disabled).toBe(true) // 缺频率

    document.body.innerHTML = ''
    mountDialog({
      name: '有名字',
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      cron: '0 * * * *',
    })
    await flushPromises()
    expect(submit().disabled).toBe(false)
  })

  it('RSSHub 没配实例时，光有路由也保存不了', async () => {
    mountDialog({
      name: '有名字',
      target: '/github/trending/daily',
      cron: '0 * * * *',
      rsshubBaseUrl: '',
    })
    await flushPromises()
    expect(submit().disabled).toBe(true)
  })

  it('停用的数据源：开关关掉后提交带着 enabled=false', async () => {
    const wrapper = mountDialog({
      name: '停用的',
      kind: 'rss',
      target: 'https://example.com/feed.xml',
      cron: '*/30 * * * *',
      enabled: false,
    })
    await flushPromises()
    await click(submit())
    expect((wrapper.emitted('submit')?.[0]?.[0] as { enabled: boolean }).enabled).toBe(false)
  })

  it('这次没保存的输入不会留到下次打开', async () => {
    const wrapper = mountDialog({
      name: 'B 站排行',
      target: '/bilibili/ranking/all',
      rsshubBaseUrl: 'http://192.168.5.100:1200',
    })
    await flushPromises()
    input('source-dialog-name').value = '改了一半'
    input('source-dialog-name').dispatchEvent(new Event('input'))
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(input('source-dialog-name').value).toBe('B 站排行')
  })
})
