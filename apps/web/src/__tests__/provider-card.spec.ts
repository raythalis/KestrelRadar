import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ProviderCard from '@/components/biz/ProviderCard.vue'
import i18n from '@/plugins/i18n'

const provider = {
  id: 'p1',
  name: '本机 Ollama',
  kind: 'ollama' as const,
  baseUrl: 'http://127.0.0.1:11434',
  hasApiKey: false,
  enabled: true,
  sortOrder: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

/** 弹窗内容 teleport 到 body，这里只挂组件本身 */
function mountCard(overrides: Record<string, unknown> = {}) {
  return mount(ProviderCard, {
    props: { provider: { ...provider, ...overrides } },
    global: { plugins: [i18n] },
  })
}

describe('ProviderCard', () => {
  it('卡上给名称、图标、类型胶囊与编辑 / 删除', () => {
    const wrapper = mountCard()
    expect(wrapper.get('[data-test="provider-name"]').text()).toBe('本机 Ollama')
    expect(wrapper.get('[data-test="provider-kind"]').text()).toBe('Ollama')
    expect(wrapper.find('.k2-tile i').exists()).toBe(true)
    expect(wrapper.find('[data-test="provider-edit"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="provider-delete"]').exists()).toBe(true)
  })

  it('v1.0 不做启停：卡上没有开关', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-test="provider-enabled"]').exists()).toBe(false)
    expect(wrapper.find('.k2-switch').exists()).toBe(false)
  })

  it('不显示接口地址与密钥状态（都收进编辑弹窗）', () => {
    const wrapper = mountCard({ hasApiKey: true })
    expect(wrapper.text()).not.toContain('127.0.0.1')
    expect(wrapper.text()).not.toContain('Key')
  })

  it('点编辑 / 删除只出事件', async () => {
    const wrapper = mountCard()
    await wrapper.get('[data-test="provider-edit"]').trigger('click')
    await wrapper.get('[data-test="provider-delete"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
