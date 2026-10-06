/**
 * Style Lab 守卫（S7）：锁住「样例 = 真组件或设计系统原始零件」这个形态，
 * 防止以后又手写一套生产组件的复刻结构。
 *
 * 规则来源：Style Lab 实施计划 §11。分类按**当前实际使用**得出，
 * 不写死一份生产组件黑名单；新增 lab-* 视觉类必须显式加进下面的白名单。
 *
 * 已知欠账（**不计入守卫**）：
 *   - FormSamples「危险操作」的手写卡片结构（k2-card--sm + __head/__heading/__foot）：
 *     按你的决定先保留，当布局/primitive 示例看待；primitive 与组件结构要区分，
 *     所以**不**把守卫扩大到所有 k2-card*。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const WEB = process.cwd()
const LAB_DIR = resolve(WEB, 'src/views/style-lab')
const LAB_VIEW = resolve(WEB, 'src/views/StyleLabView.vue')

/** lab-* 视觉类白名单：S7 冻结时的实际清单；新增类必须显式加进来 */
const LAB_CLASS_ALLOWLIST = new Set([
  // 版式（lab.scss）
  'lab__h3',
  'lab__meta',
  'lab__note',
  'lab__cols',
  'lab__cols--wide',
  'lab__controls',
  'lab__metrics',
  'lab__gap-top',
  'lab__spacer',
  'lab-setgrid',
  'lab-row',
  'lab-row--end',
  'lab-box-sm',
  'lab-box-md',
  'lab-form',
  'lab-menu',
  'lab-truncate',
  'lab-panel',
  'lab-tabs--demo',
  'lab-parts',
  'lab-list',
  'lab-skeleton',
  'lab-layout',
  'lab-dialogbar',
  'lab-fieldstack',
  'lab-settings',
  'lab-setlist',
  'lab-setnav',
  'lab-setnav__item',
  'lab-setnav__item--on',
  'lab-setrow',
  'lab-setrow__main',
  'lab-setrow__side',
  'lab-input',
  'lab-input--num',
  'lab-input--url',
  'lab-seg',
  'lab-seg__item',
  'lab-seg__item--on',
])

/** 已经清零、不得再出现的手写复刻结构 */
const FORBIDDEN = [
  'k2-line', // 旧手写分线（S4 已换成真 ScoreBandField）
  'k2-band', // 真组件内部类，不得在样例里手写
  'k2-words', // 真 ExcludeWordsField 内部类
  'k2-empty', // 空态只走真 AppEmptyState
  'k2-alert', // 提示类只走真 AppHint
  'k2-flip', // 翻卡结构由真卡片给出
  'k2-group', // 分组结构由真 GroupPanel 给出
  'k2-col__add', // 分组列底由真 GroupPanel 给出
  'k2-nav', // 侧栏由真 AppSidebar/AppShell 给出
  'k2-shell', // 外壳由真组件给出
  'k2-preset', // CronPicker 相关的手写控件
  'k2-sched',
  'k2-dialog', // 手写弹窗骨架（弹窗只走真 FormDialog / ConfirmDialog / GroupDialog）
  'k2-tabs', // 手写标签页（只走真 AppTabs，见 AppShowcase）
  'lab-scrim', // 手写遮罩（弹窗必须用真组件）
  'lab-excl__', // 旧手写排除词结构
]

/** 必须能在样例里找到的真组件（正面断言） */
const REQUIRED_COMPONENTS = [
  'ScoreBandField',
  'ExcludeWordsField',
  'CronPicker',
  'FormDialog',
  'ConfirmDialog',
  'GroupDialog',
  'GroupPanel',
  'AppEmptyState',
]

function labFiles(): string[] {
  return readdirSync(LAB_DIR)
    .filter((f) => extname(f) === '.vue')
    .map((f) => join(LAB_DIR, f))
}

function read(p: string): string {
  return readFileSync(p, 'utf8')
}

function styleBlocks(source: string): string {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '').join('\n')
}

describe('Style Lab 守卫', () => {
  const samples = labFiles()
  const all = samples.map((p) => ({ path: p, src: read(p) }))
  const view = read(LAB_VIEW)

  it('样例文件仍然存在（防止守卫空跑）', () => {
    expect(samples.length).toBeGreaterThanOrEqual(5)
  })

  it('不得出现已清零的手写复刻结构', () => {
    const hits: string[] = []
    for (const { path, src } of [...all, { path: LAB_VIEW, src: view }]) {
      for (const token of FORBIDDEN) {
        if (src.includes(token)) hits.push(`${path.split('/').pop()}: ${token}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('lab-* 视觉类必须命中白名单', () => {
    const unknown = new Set<string>()
    for (const { src } of [...all, { path: LAB_VIEW, src: view }]) {
      // 只看真正的 class 位置：模板里的 class="..." 与样式块里的选择器。
      const classAttrs = [...src.matchAll(/class="([^"]*)"/g)].map((m) => m[1] ?? '')
      const selectors = [...styleBlocks(src).matchAll(/\.(lab-[a-zA-Z0-9_-]+)/g)].map(
        (m) => m[1] ?? '',
      )
      for (const token of [...classAttrs.join(' ').split(/\s+/), ...selectors]) {
        if (token.startsWith('lab-') && !LAB_CLASS_ALLOWLIST.has(token)) unknown.add(token)
      }
    }
    expect([...unknown]).toEqual([])
  })

  it('样式块里不得手抄 token 数值（字号 / 圆角 / 十六进制色）', () => {
    const hits: string[] = []
    for (const { path, src } of [...all, { path: LAB_VIEW, src: view }]) {
      const css = styleBlocks(src)
      if (/font-size:\s*\d/.test(css)) hits.push(`${path.split('/').pop()}: font-size 字面值`)
      if (/border-radius:\s*\d/.test(css))
        hits.push(`${path.split('/').pop()}: border-radius 字面值`)
      if (/#[0-9a-fA-F]{3,8}\b/.test(css)) hits.push(`${path.split('/').pop()}: 十六进制色值`)
    }
    expect(hits).toEqual([])
  })

  it('fixtures.ts 只有数据，不含 markup 与 class', () => {
    const src = read(join(LAB_DIR, 'fixtures.ts'))
    expect(src.includes('<')).toBe(false)
    expect(src.includes('class=')).toBe(false)
  })

  it('样例样式块不得膨胀（每文件 <style> 不超过 250 行）', () => {
    const over = all
      .filter(({ src }) => styleBlocks(src).split('\n').length > 250)
      .map(({ path }) => path.split('/').pop())
    expect(over).toEqual([])
  })

  it('真组件必须仍在样例里被使用', () => {
    const joined = all.map(({ src }) => src).join('\n')
    const missing = REQUIRED_COMPONENTS.filter((name) => !joined.includes(name))
    expect(missing).toEqual([])
  })
})
