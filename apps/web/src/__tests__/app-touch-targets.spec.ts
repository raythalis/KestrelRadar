import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * 密度规矩：桌面按钮 32 / 输入 40，触摸端（<900px）一律 ≥44。
 * 这条规矩靠 CSS 兜底，所以这里直接盯样式文件，防止以后改样式时被无意改掉。
 */
const scss = readFileSync(resolve(process.cwd(), 'src/styles/components.scss'), 'utf8')
const vuetify = readFileSync(resolve(process.cwd(), 'src/plugins/vuetify.ts'), 'utf8')

function mobileBlock(): string {
  const start = scss.indexOf('@media (max-width: 899px)')
  expect(start).toBeGreaterThan(-1)
  return scss.slice(start, scss.indexOf('@media (min-width: 900px)', start))
}

describe('触摸端尺寸', () => {
  it('移动端按钮（含小号）抬到 44px', () => {
    const block = mobileBlock()
    expect(block).toMatch(
      /\.app-btn,\s*\.app-btn--sm\s*{[^}]*height:\s*var\(--k-control-h-touch\)/s,
    )
  })

  it('可点状态、抽屉项、开关都不低于 44px', () => {
    const block = mobileBlock()
    for (const selector of ['.app-status--action', '.app-rail__item', '.v-switch']) {
      expect(block).toContain(selector)
    }
    expect(block).toMatch(/min-height:\s*var\(--k-control-h-touch\)/)
    expect(block).toMatch(/\.app-iconbtn\s*{[^}]*width:\s*var\(--k-control-h-touch\)/s)
  })

  it('桌面密度保持 32 / 40 的层级差（按钮在 CSS，输入框走 Vuetify 的 compact）', () => {
    expect(scss).toMatch(/\.app-btn\s*{[^}]*height:\s*var\(--k-control-h\)/s)
    expect(vuetify).toMatch(/VTextField:\s*{[^}]*density:\s*'compact'/s)
    expect(vuetify).toMatch(/VSelect:\s*{[^}]*density:\s*'compact'/s)
    // 桌面 32 只在指针设备上出现，触摸端在移动块里被抬起来
    expect(mobileBlock()).toMatch(
      /\.v-input \.v-field\s*{[^}]*min-height:\s*var\(--k-control-h-touch\)/s,
    )
  })
})
