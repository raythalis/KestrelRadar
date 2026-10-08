import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ProviderDialog from '@/components/biz/ProviderDialog.vue'
import appComponents from '@/plugins/components'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'

// 弹窗内容 teleport 到 body，挂上去以后直接查 document 才拿得到真实渲染结果
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ProviderDialog, {
    props: { modelValue: true, ...props },
    global: { plugins: [vuetify, i18n, appComponents] },
    attachTo: document.body,
  })
}

const field = (test: string): HTMLInputElement =>
  (document.querySelector(`[data-test="${test}"] input`) ??
    document.querySelector(`[data-test="${test}"]`)) as HTMLInputElement
const type = async (test: string, value: string): Promise<void> => {
  const el = field(test)
  el.value = value
  el.dispatchEvent(new Event('input'))
  await flushPromises()
}
const save = (): HTMLButtonElement =>
  document.querySelector('[data-test="provider-save"]') as HTMLButtonElement

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ProviderDialog 的地址形状', () => {
  it('接口地址不是 http(s)：就地报红，保存点不动', async () => {
    mountDialog()
    await flushPromises()
    await type('provider-name-input', '本机 Ollama')
    await type('provider-base-url-input', '127.0.0.1:11434')

    expect(document.body.textContent).toContain('http://')
    expect(save().disabled).toBe(true)
  })

  it('地址填对了就能保存，值去掉两边空格', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await type('provider-name-input', '本机 Ollama')
    await type('provider-base-url-input', ' http://127.0.0.1:11434 ')

    expect(save().disabled).toBe(false)
    save().click()
    await flushPromises()
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: '本机 Ollama',
      baseUrl: 'http://127.0.0.1:11434',
    })
  })
})
