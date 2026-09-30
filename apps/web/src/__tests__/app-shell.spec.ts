import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'

import AppShell from '@/layouts/AppShell.vue'
import i18n from '@/plugins/i18n'

const vuetify = createVuetify()

function mountShell() {
  return mount(AppShell, {
    global: { plugins: [createPinia(), vuetify, i18n] },
  })
}

describe('AppShell', () => {
  it('渲染应用名与骨架提示', () => {
    const wrapper = mountShell()
    expect(wrapper.get('[data-test="app-name"]').text()).toContain('Kestrel')
    expect(wrapper.get('[data-test="shell-body"]').text()).toContain('界面骨架已就绪')
  })
})
