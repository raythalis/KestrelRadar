import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { LEGACY_VARS } from '@/design/v2/tokens'

/**
 * Token 守卫（Batch A「Design Token 收口」）：
 * 1. 正式 token 只有一套 —— `--k2-*`，来自 design/v2/tokens.ts。
 * 2. 旧名 `--k-*` 只允许出现在兼容别名表（LEGACY_VARS）和白名单文件里；
 *    B 批处理掉那 12 个零生产引用 App 组件后，白名单清空、别名表整块删除，才轮到「旧名归零」。
 * 3. Vuetify 色板不再有第二份：plugins/vuetify.ts 不写色值，一律从 design/v2/tokens.ts 生成。
 * 4. 注入点收敛：生产只有 AppShell 一处注入 v2 变量（Style Lab 给自己的预览容器另注入一份）。
 */

const root = process.cwd()
const srcDir = resolve(root, 'src')

/** 允许出现旧名 `--k-*` 的文件 —— 白名单，B 批之后应逐步清空 */
const LEGACY_FILE_WHITELIST = ['styles/components.scss', 'styles/main.scss']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue
      walk(full, out)
    } else if (/\.(scss|vue|ts)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

const rel = (full: string): string => full.slice(srcDir.length + 1)

/** 旧名引用：`--k-…`，排除正式名 `--k2-*` */
function legacyNamesIn(text: string): string[] {
  return [...text.matchAll(/--k-(?!2)[a-z0-9-]+/g)].map((m) => m[0])
}

describe('token 守卫 · 单一正式体系', () => {
  it('旧名只出现在白名单文件里，没有新文件偷偷用旧名', () => {
    const offenders: string[] = []
    for (const file of walk(srcDir)) {
      const p = rel(file)
      if (p === 'design/v2/tokens.ts') continue
      if (legacyNamesIn(readFileSync(file, 'utf8')).length === 0) continue
      if (!LEGACY_FILE_WHITELIST.includes(p)) offenders.push(p)
    }
    expect(offenders).toEqual([])
  })

  it('出现的每个旧名都在兼容别名表里有映射（没有漏网的旧变量）', () => {
    const missing = new Set<string>()
    for (const file of walk(srcDir)) {
      const p = rel(file)
      if (p === 'design/v2/tokens.ts') continue
      for (const name of legacyNamesIn(readFileSync(file, 'utf8'))) {
        if (!(name in LEGACY_VARS)) missing.add(name)
      }
    }
    expect([...missing]).toEqual([])
  })

  it('正式名只有一套：design/tokens（v1 模块）已不存在', () => {
    let exists = true
    try {
      statSync(resolve(srcDir, 'design/tokens'))
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })

  it('Vuetify 色板从 v2 token 生成，文件里不写死色值', () => {
    const vuetify = readFileSync(resolve(srcDir, 'plugins/vuetify.ts'), 'utf8')
    expect(vuetify).toContain("from '@/design/v2/tokens'")
    expect(vuetify).not.toContain("from '@/design/tokens'")
    expect(vuetify).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(vuetify).not.toMatch(/rgba?\(/)
  })

  it('v2 变量只在两处注入：AppShell（生产）与 Style Lab（预览容器）', () => {
    const callers: string[] = []
    for (const file of walk(srcDir)) {
      const text = readFileSync(file, 'utf8')
      if (/applyV2Vars\(|applyV2Theme\(/.test(text)) callers.push(rel(file))
    }
    // stores/ui.ts 里那个 applyCurrentTheme 是历史导出（当前零调用），走同一套注入
    expect(callers.sort()).toEqual([
      'design/v2/tokens.ts',
      'layouts/AppShell.vue',
      'stores/ui.ts',
      'views/StyleLabView.vue',
    ])
    expect(readFileSync(resolve(srcDir, 'layouts/AppShell.vue'), 'utf8')).toContain('applyV2Theme')
  })
})
