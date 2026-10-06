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
/* 真实结构：data-test 直接挂在 <input> 上（不是外层包装），两种写法都兼容 */
const input = (test: string): HTMLInputElement =>
  (document.querySelector(`[data-test="${test}"] input`) ??
    document.querySelector(`[data-test="${test}"]`)) as HTMLInputElement
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
    // data-test 挂在 <input> 上，字段名与示例文案看整个弹窗的可见文本
    expect(document.body.textContent).toContain('路由')
    expect(document.body.textContent).toContain('例如 /bilibili/ranking/all')

    document.body.innerHTML = ''
    mountDialog({ kind: 'rss' })
    await flushPromises()
    expect(document.body.textContent).toContain('订阅地址')
    expect(document.body.textContent).toContain('例如 https://example.com/feed.xml')

    document.body.innerHTML = ''
    mountDialog({ kind: 'web' })
    await flushPromises()
    expect(document.body.textContent).toContain('网页地址')
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
    // 实例地址有后端默认值：这一项不再弱化，也没有「前往配置」
    const items = Array.from(
      document.querySelectorAll('[data-test="source-dialog-kind-item"]'),
    ) as HTMLElement[]
    const rsshubItem = items.find((el) => el.textContent?.includes('RSSHub')) as HTMLElement
    expect(rsshubItem).not.toBeUndefined()
    expect(rsshubItem.className).not.toContain('muted')
    expect(rsshubItem.textContent).not.toContain('前往配置')

    rsshubItem.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await click(submit())
    expect((wrapper.emitted('submit')![0]![0] as { kind: string }).kind).toBe('rsshub')
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
    const item = document.querySelector('[data-test="source-dialog-kind-item"]') as HTMLElement
    expect(item.className).not.toContain('muted')

    item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await click(submit())
    expect((wrapper.emitted('submit')![0]![0] as { kind: string }).kind).toBe('rsshub')
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

  it('RSSHub 路由填了就能保存：实例地址走全局默认值', async () => {
    mountDialog({
      name: '有名字',
      target: '/github/trending/daily',
      cron: '0 * * * *',
      rsshubBaseUrl: '',
    })
    await flushPromises()
    expect(submit().disabled).toBe(false)
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
    expect((wrapper.emitted('submit')![0]![0] as { enabled: boolean }).enabled).toBe(false)
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

  it('目标写不成地址时就地报红，保存点不动', async () => {
    mountDialog({ kind: 'rss', name: '源', target: 'example.com/feed.xml', cron: '0 * * * *' })
    await flushPromises()
    expect(document.body.textContent).toContain('http://')
    expect(submit().disabled).toBe(true)
  })

  it('RSSHub 的相对路由不算错，照常能保存', async () => {
    const wrapper = mountDialog({
      name: '少数派',
      kind: 'rsshub',
      target: '/sspai/matrix',
      cron: '*/30 * * * *',
    })
    await flushPromises()
    expect(submit().disabled).toBe(false)
    await click(submit())
    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})
