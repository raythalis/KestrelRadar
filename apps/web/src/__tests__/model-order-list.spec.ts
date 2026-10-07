import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ModelOrderList from '@/components/biz/ModelOrderList.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

const OLLAMA = { id: 'mp1', name: '本机 Ollama', models: ['qwen3:8b', 'llama3.3:70b'] }
const DEEPSEEK = { id: 'mp2', name: 'DeepSeek 官方', models: ['deepseek-chat'] }
/** 取不到模型的那家：models 为空，选项里一条都不该有它 */
const GATEWAY = { id: 'mp3', name: '内网网关', models: [] }
const PROVIDERS = [OLLAMA, DEEPSEEK, GATEWAY]

function mountList(props: Record<string, unknown> = {}) {
  return mount(ModelOrderList, {
    props: { value: [null], providers: PROVIDERS, ...props },
    global: { plugins: [vuetify, i18n, appComponents] },
  })
}

type Wrapper = ReturnType<typeof mountList>
const rowCount = (wrapper: Wrapper): number =>
  wrapper.findAll('[data-test="model-order-row"]').length

describe('ModelOrderList', () => {
  it('默认给一行空的；选中的行不会再自动补一行', () => {
    expect(rowCount(mountList())).toBe(1)
    expect(rowCount(mountList({ value: ['mp1:qwen3:8b'] }))).toBe(1)
    expect(rowCount(mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat'] }))).toBe(2)
  })

  it('加号在卡片右上：点一次加一行，到三行就禁用（还在，只是点不动）', async () => {
    const wrapper = mountList()
    const add = wrapper.get('[data-test="model-order-add"]')
    expect(add.attributes('disabled')).toBeUndefined()

    await add.trigger('click')
    expect(wrapper.emitted('update:value')?.[0]).toEqual([[null, null]])

    const full = mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat', 'mp1:llama3.3:70b'] })
    const fullAdd = full.get('[data-test="model-order-add"]')
    expect(rowCount(full)).toBe(3)
    expect(fullAdd.attributes('disabled')).toBeDefined()
    await fullAdd.trigger('click')
    expect(full.emitted('update:value')).toBeUndefined()
  })

  it('只有一行时不显示删除按钮，两行以上才有', () => {
    expect(mountList().find('[data-test="model-order-remove"]').exists()).toBe(false)
    const two = mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat'] })
    expect(two.findAll('[data-test="model-order-remove"]')).toHaveLength(2)
  })

  it('删一行后仍至少留一行空行', async () => {
    const wrapper = mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat'] })
    await wrapper.findAll('[data-test="model-order-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('update:value')?.[0]).toEqual([['mp2:deepseek-chat']])
  })

  it('抓着抓手拖动就换顺序', async () => {
    const wrapper = mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat', 'mp1:llama3.3:70b'] })
    const rows = wrapper.findAll('[data-test="model-order-row"]')
    await rows[0]!.find('[data-test="model-order-grip"]').trigger('dragstart')
    await rows[2]!.trigger('dragover')
    await rows[2]!.trigger('drop')
    expect(wrapper.emitted('update:value')?.[0]).toEqual([
      ['mp2:deepseek-chat', 'mp1:llama3.3:70b', 'mp1:qwen3:8b'],
    ])
  })

  it('供应商被删、选项里没这个值了：那一行自动消失，末尾仍留一行空的', async () => {
    const wrapper = mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat'] })
    expect(rowCount(wrapper)).toBe(2)

    // 上游把 DeepSeek 那家删了：它的模型不在选项里了
    await wrapper.setProps({ providers: [OLLAMA] })
    await flushPromises()
    expect(rowCount(wrapper)).toBe(1)
    expect(wrapper.findAll('[data-test^="model-order-select"]')).toHaveLength(1)

    // 连唯一用到的那家也被删 → 回到一行空的
    await wrapper.setProps({ providers: [] })
    await flushPromises()
    expect(rowCount(wrapper)).toBe(1)
  })

  it('下拉用的是全站同一套外观（k2-select + k2-menu），选项按「供应商:模型」拼，取不到模型的那家静默缺席', async () => {
    const wrapper = mountList()
    expect(wrapper.get('[data-test="model-order-select-0"]').classes()).toContain('k2-select')

    await wrapper.get('[data-test="model-order-select-0"]').trigger('click')
    await flushPromises()
    const items = [...document.querySelectorAll('.k2-menu__item')] as HTMLElement[]
    expect(items.map((el) => el.textContent.trim())).toEqual([
      '本机 Ollama:qwen3:8b',
      '本机 Ollama:llama3.3:70b',
      'DeepSeek 官方:deepseek-chat',
    ])
    document.body.innerHTML = ''
  })

  it('从菜单里点一项：整行换成这一项', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-test="model-order-select-0"]').trigger('click')
    await flushPromises()

    const items = [...document.querySelectorAll('.k2-menu__item')] as HTMLElement[]
    items[1]!.click()
    await flushPromises()

    expect(wrapper.emitted('update:value')?.[0]).toEqual([['mp1:llama3.3:70b']])
    document.body.innerHTML = ''
  })

  it('供应商的清单还没回来时：已选中的那一行照原样显示成人话，不露「id:模型名」', () => {
    // 供应商还在，只是它的模型清单还没问到（或者它已经不报这个模型了）
    const loading = [{ id: 'mp1', name: '本机 Ollama', models: [] }]
    const wrapper = mountList({ value: ['mp1:qwen3:8b'], providers: loading })

    expect(rowCount(wrapper)).toBe(1)
    const text = wrapper.get('[data-test="model-order-select-0"]').text()
    expect(text).toContain('本机 Ollama:qwen3:8b')
    expect(text).not.toContain('mp1:')
  })

  it('标题用字段标签的样式，说明在它下一行；加号与保存都是主色', () => {
    const wrapper = mountList()
    const label = wrapper.get('.k2-order__headtext .k2-field__label')
    expect(label.text()).toBe('模型调用顺序')
    expect(wrapper.get('.k2-order__headtext .k2-order__sub').text()).toBe(
      '按顺序依次尝试，前面的失败就用下一个',
    )

    expect(wrapper.get('[data-test="model-order-add"]').classes()).toContain('k2-iconbtn--primary')
    expect(wrapper.get('[data-test="model-order-save"]').classes()).toContain('app-btn--primary')
  })

  it('保存按钮只出事件', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-test="model-order-save"]').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
