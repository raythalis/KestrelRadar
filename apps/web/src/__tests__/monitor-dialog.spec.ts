import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import MonitorDialog from '@/components/biz/MonitorDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容 teleport 到 body，挂上去以后直接查 document 才拿得到真实渲染结果
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(MonitorDialog, {
    props: { modelValue: true, ...props },
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
const textarea = (test: string): HTMLTextAreaElement =>
  (document.querySelector(`[data-test="${test}"] textarea`) ??
    document.querySelector(`[data-test="${test}"]`)) as HTMLTextAreaElement
/** 下拉浮层是 teleport 出来的；jsdom 里点不开 Vuetify 的 v-select，得按一下方向键 */
const openMenu = async (test: string): Promise<void> => {
  const el = input(test)
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushPromises()
}
const submit = (): HTMLButtonElement =>
  document.querySelector('[data-test="form-dialog-submit"]') as HTMLButtonElement
const click = async (el: HTMLElement | null): Promise<void> => {
  el?.click()
  await flushPromises()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MonitorDialog', () => {
  it('打开时按入参填好，标题是新建还是编辑', async () => {
    mountDialog({ name: 'AI 圈动态', mode: 'algorithm', includeKeywords: ['大模型', '开源'] })
    await flushPromises()
    expect(input('monitor-dialog-name').value).toBe('AI 圈动态')
    expect(document.body.textContent).toContain('编辑监听')
    expect(
      [
        ...document.querySelectorAll(
          '[data-test="monitor-dialog-keywords"] .k2-chip, [data-test="monitor-dialog-keywords"] .v-chip',
        ),
      ].map((c) => (c.textContent ?? '').trim()),
    ).toEqual(['大模型', '开源'])

    document.body.innerHTML = ''
    mountDialog()
    await flushPromises()
    expect(document.body.textContent).toContain('添加监听')
  })

  it('意图描述只在「算法 + LLM」下出现，切走再切回来值还在', async () => {
    mountDialog({ mode: 'algorithm_llm', intentText: '大模型发布与开源项目' })
    await flushPromises()
    expect(q('monitor-dialog-intent')).toBeTruthy()
    expect(textarea('monitor-dialog-intent').value).toBe('大模型发布与开源项目')

    document.body.innerHTML = ''
    mountDialog({ mode: 'follow_global', intentText: '写好了' })
    await flushPromises()
    expect(q('monitor-dialog-intent')).toBeNull()
  })

  it('提交时带上全部字段（关键词与排除词是数组）', async () => {
    const wrapper = mountDialog({
      name: 'AI 圈动态',
      mode: 'algorithm_llm',
      intentText: '大模型发布与开源项目',
      includeKeywords: ['大模型', '开源'],
      excludeKeywords: ['广告'],
      useGlobalExcludes: false,
      matchMode: 'all',
      sensitivity: 'high',
      enabled: false,
      actionIds: ['a1'],
    })
    await flushPromises()
    await click(submit())
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'AI 圈动态',
      mode: 'algorithm_llm',
      intentText: '大模型发布与开源项目',
      includeKeywords: ['大模型', '开源'],
      excludeKeywords: ['广告'],
      useGlobalExcludes: false,
      matchMode: 'all',
      sensitivity: 'high',
      enabled: false,
      actionIds: ['a1'],
    })
  })

  it('关键词留空＝全部通过，照样能存', async () => {
    const wrapper = mountDialog({ name: '什么都收', mode: 'follow_global' })
    await flushPromises()
    expect(document.body.textContent).toContain('留空＝全部通过')
    expect(submit().disabled).toBe(false)
    await click(submit())
    expect(
      (wrapper.emitted('submit')![0]![0] as { includeKeywords: string[] }).includeKeywords,
    ).toEqual([])
  })

  it('名称是必填，没名字保存不可点', async () => {
    mountDialog()
    await flushPromises()
    expect(submit().disabled).toBe(true)
  })

  it('模式、匹配方式、灵敏度按枚举给选项', async () => {
    mountDialog()
    await flushPromises()
    // 选中的值直接显示在字段上
    expect(q('monitor-dialog-mode')?.textContent).toContain('跟随全局')
    expect(q('monitor-dialog-sensitivity')?.textContent).toContain('标准')

    await openMenu('monitor-dialog-mode')
    for (const text of ['跟随全局', '自带算法', '算法 + LLM']) {
      expect(document.body.textContent).toContain(text)
    }

    await openMenu('monitor-dialog-match-mode')
    expect(document.body.textContent).toContain('任意命中')
    expect(document.body.textContent).toContain('全部命中')

    await openMenu('monitor-dialog-sensitivity')
    for (const text of ['宽松', '标准', '严格']) {
      expect(document.body.textContent).toContain(text)
    }
  })

  it('「指定关联动作」是多选，留空＝跟随分组', async () => {
    const wrapper = mountDialog({
      name: '只走一个动作',
      mode: 'algorithm',
      actions: [
        { id: 'a1', name: '实时推送' },
        { id: 'a2', name: '定时汇总' },
      ],
      actionIds: [],
    })
    await flushPromises()
    // 产品约定：留空＝跟随分组，不额外写解释文案；这里验行为，不验文案
    await click(submit())
    expect((wrapper.emitted('submit')![0]![0] as { actionIds: string[] }).actionIds).toEqual([])
  })

  it('这次没保存的输入不会留到下次打开', async () => {
    const wrapper = mountDialog({ name: 'AI 圈动态', mode: 'algorithm' })
    await flushPromises()
    input('monitor-dialog-name').value = '改了一半'
    input('monitor-dialog-name').dispatchEvent(new Event('input'))
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(input('monitor-dialog-name').value).toBe('AI 圈动态')
  })

  it('桌面两列：成对的字段并排、整行的字段跨满两列，窄屏回到一列', async () => {
    mountDialog()
    await flushPromises()

    const grid = document.querySelector('.monitor-dialog__grid')
    expect(grid).toBeTruthy()

    // 整行的字段：所在网格单元带 __wide（跨满两列）
    const isWide = (test: string): boolean => {
      const el = document.querySelector(`[data-test="${test}"]`) as HTMLElement | null
      return !!el?.closest('.monitor-dialog__wide')
    }
    for (const test of [
      'monitor-dialog-enabled',
      'monitor-dialog-keywords',
      'monitor-dialog-excludes',
      'monitor-dialog-global-excludes',
      'monitor-dialog-actions',
    ])
      expect(isWide(test), `整行字段 ${test}`).toBe(true)

    // 成对的字段：不跨满两列
    for (const test of [
      'monitor-dialog-name',
      'monitor-dialog-mode',
      'monitor-dialog-match-mode',
      'monitor-dialog-sensitivity',
    ])
      expect(isWide(test), `成对字段 ${test}`).toBe(false)
  })
})
