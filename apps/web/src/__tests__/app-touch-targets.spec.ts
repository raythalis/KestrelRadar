import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * 密度规矩（v2 正式体系）：桌面按钮 40 / 输入 44；触摸端一律抬到 --k2-touch-h（48，不低于 44 的可用下限）。
 * 这条规矩靠 CSS 兜底，所以这里直接盯样式文件，防止以后改样式时被无意改掉。
 * 业务组件自己的触摸尺寸由 v2 层负责（v1 的 biz.scss 已在 token 收口批次删除）。
 */
const scss = readFileSync(resolve(process.cwd(), 'src/styles/components.scss'), 'utf8')
const vuetify = readFileSync(resolve(process.cwd(), 'src/plugins/vuetify.ts'), 'utf8')
const v2Scss = readFileSync(resolve(process.cwd(), 'src/styles/v2.scss'), 'utf8')

/** 触摸档块：含按钮 + 图标按钮触摸规则的那个 899px 媒体块 */
function touchBlock(): string {
  const marker = '@media (max-width: 899px)'
  let found = -1
  for (let i = scss.indexOf(marker); i !== -1; i = scss.indexOf(marker, i + 1)) {
    const window = scss.slice(i, i + 900)
    if (window.includes('.app-btn--sm') && window.includes('.app-iconbtn')) found = i
  }
  expect(found).toBeGreaterThan(-1)
  return scss.slice(found, found + 900)
}

/** 取包含某段文本的那个媒体块窗口（v1 组件层现在只剩这两处触摸规则） */
function blockAround(anchorText: string, length = 700): string {
  const anchor = scss.indexOf(anchorText)
  expect(anchor).toBeGreaterThan(-1)
  const start = scss.lastIndexOf('@media', anchor)
  return scss.slice(start, anchor + length)
}

function v2MobileBlock(): string {
  // v2 的移动档是 1183（内容区硬保 900：1184 起才是桌面档）
  const start = v2Scss.indexOf('@media (max-width: 1183px)')
  expect(start).toBeGreaterThan(-1)
  return v2Scss.slice(start)
}

describe('触摸端尺寸 · v2 层（外壳与已迁移的页面）', () => {
  it('抽屉项、底部导航项、图标按钮都不低于 48px', () => {
    const block = v2MobileBlock()
    for (const selector of ['.k2-nav__item', '.k2-iconbtn', '.k2-preset']) {
      expect(block).toContain(selector)
    }
    expect(block).toMatch(/min-block-size:\s*var\(--k2-touch-h\)/)
  })

  it('窄屏收起侧栏：抽屉里始终是完整导航，把手藏起来', () => {
    const block = v2MobileBlock()
    expect(block).toMatch(/\.k2-shell--rail \.k2-nav,/)
    expect(block).toMatch(/\.k2-shell--rail \.k2-nav__label[^{]*{[^}]*inline-size:\s*auto/s)
    expect(block).toMatch(/\.k2-nav__handle\s*{[^}]*display:\s*none/s)
  })

  it('桌面收起侧栏：文字整条退出布局，不能只靠裁切露出半个字', () => {
    expect(v2Scss).toMatch(
      /\.k2-shell--rail \.k2-nav__label,\s*\.k2-shell--rail \.k2-nav__name\s*{[^}]*inline-size:\s*0[^}]*opacity:\s*0/s,
    )
  })
})

describe('触摸端尺寸 · 组件层', () => {
  it('移动端按钮（含小号）抬到触摸档', () => {
    expect(touchBlock()).toMatch(
      /\.app-btn,\s*\.app-btn--sm\s*{[^}]*height:\s*var\(--k2-touch-h\)/s,
    )
  })

  it('可点状态、开关、图标按钮都不低于触摸档', () => {
    const block = touchBlock()
    for (const selector of ['.k2-chip--action', '.v-switch', '.app-iconbtn']) {
      expect(block).toContain(selector)
    }
    expect(block).toMatch(/min-height:\s*var\(--k2-touch-h\)/)
    expect(block).toMatch(/\.app-iconbtn\s*{[^}]*width:\s*var\(--k2-touch-h\)/s)
  })

  it('桌面密度保持两档层级差（按钮在 CSS，输入框走 Vuetify 的 compact）', () => {
    expect(scss).toMatch(/\.app-btn\s*{[^}]*height:\s*var\(--k2-control-h\)/s)
    expect(vuetify).toMatch(/VTextField:\s*{[^}]*density:\s*'compact'/s)
    expect(vuetify).toMatch(/VSelect:\s*{[^}]*density:\s*'compact'/s)
    // 桌面按 density 走，触摸端在移动块里被抬起来
    expect(blockAround('.v-input .v-field', 300)).toMatch(
      /\.v-input \.v-field\s*{[^}]*min-height:\s*var\(--k2-touch-h\)/s,
    )
  })
})
