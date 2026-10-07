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

const rowCount = (wrapper: ReturnType<typeof mountList>): number =>
  wrapper.findAll('[data-test="model-order-row"]').length

describe('ModelOrderList', () => {
  it('默认给一行空的；选中的行不会再自动补一行', () => {
    expect(rowCount(mountList())).toBe(1)
    expect(rowCount(mountList({ value: ['mp1:qwen3:8b'] }))).toBe(1)
    expect(rowCount(mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat'] }))).toBe(2)
  })

  it('+ 号加一行，到三行就收起来', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-test="model-order-add"]').trigger('click')
    // 受控：值在父级，点一次加一行
    expect(wrapper.emitted('update:value')?.[0]).toEqual([[null, null]])

    const two = mountList({ value: [null, null] })
    await two.get('[data-test="model-order-add"]').trigger('click')
    expect(two.emitted('update:value')?.[0]).toEqual([[null, null, null]])

    const full = mountList({ value: ['mp1:qwen3:8b', 'mp2:deepseek-chat', 'mp1:llama3.3:70b'] })
    expect(rowCount(full)).toBe(3)
    expect(full.find('[data-test="model-order-add"]').exists()).toBe(false)
  })

  it('删掉一行后至少还留一行空的', async () => {
    const wrapper = mountList({ value: ['mp1:qwen3:8b'] })
    await wrapper.get('[data-test="model-order-remove"]').trigger('click')
    expect(wrapper.emitted('update:value')?.[0]).toEqual([[null]])
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

  it('选项按「供应商:模型」拼，取不到模型的那家静默缺席', async () => {
    const wrapper = mountList()
    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items') as { title: string }[]
    expect(items.map((item) => item.title)).toEqual([
      '本机 Ollama:qwen3:8b',
      '本机 Ollama:llama3.3:70b',
      'DeepSeek 官方:deepseek-chat',
    ])
  })

  it('保存按钮只出事件', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-test="model-order-save"]').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
