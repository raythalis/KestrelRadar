/**
 * i18n 覆盖的护栏：切到 English 时不该再看到中文。
 *
 * 规矩（2026-10-07 定版）：
 * - 用户可见文本一律进 locales（zh-CN / en 两边 key 完全同步）；
 * - app/* 组件不写死文案，文案走 props；biz/* 与页面用自己的 t()；
 * - 新增用户文本必须经过 i18n —— 写死中文的会被这里的「源码扫描」拦下来；
 * - 例外只有两处：语言名按自身语言写（中文 / English），以及只在开发环境挂载的 /style-lab。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { API_ERROR_CODES, OPERATION_CODES, VALIDATION_RULES } from '@kestrel/contracts'
import { describe, expect, it } from 'vitest'

import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'

// 用例的 cwd 就是 apps/web（vitest 的 root），直接按它拼 src 路径
const SRC_ROOT = join(process.cwd(), 'src')
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/** 唯一允许的字面量：语言名按自身语言写 */
const LANGUAGE_NAME_ALLOWED = "title: '中文'"

function flatten(node: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else if (value && typeof value === 'object') {
      Object.assign(out, flatten(value as Record<string, unknown>, path))
    }
  }
  return out
}

/** 注释里的中文是允许的（注释不给人看）：把它们换成空格，等长替换，行号不变 */
function stripComments(source: string): string {
  const out = [...source]
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i += 1) if (source[i] !== '\n') out[i] = ' '
  }
  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (char === "'" || char === '"' || char === '`') {
      i += 1
      while (i < source.length) {
        if (source[i] === '\\') i += 2
        else if (source[i] === char) {
          i += 1
          break
        } else i += 1
      }
      continue
    }
    if (source.startsWith('//', i)) {
      const end = source.indexOf('\n', i)
      blank(i, end < 0 ? source.length : end)
      i = end < 0 ? source.length : end
      continue
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2)
      const stop = end < 0 ? source.length : end + 2
      blank(i, stop)
      i = stop
      continue
    }
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4)
      const stop = end < 0 ? source.length : end + 3
      blank(i, stop)
      i = stop
      continue
    }
    i += 1
  }
  return out.join('')
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'locales') return []
      return sourceFiles(full)
    }
    return full.endsWith('.ts') || full.endsWith('.vue') ? [full] : []
  })
}

const zh = flatten(zhCN as never)
const EN = flatten(en as never)

describe('语言包', () => {
  it('中英两份 key 完全同步', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(zh).sort())
  })

  it('en 里不出现中文（语言名按自身语言写，是唯一例外）', () => {
    const offenders = Object.entries(EN)
      .filter(([key]) => !key.startsWith('settings.language.'))
      .filter(([, value]) => CJK.test(value))
      .map(([key, value]) => `${key}=${value}`)
    expect(offenders).toEqual([])
    // 例外本身也要说清楚：中文那份语言名叫「简体中文」
    expect(EN['settings.language.zh']).toBe('简体中文')
  })

  /** 某一组下面的直接子键（拍平后的前缀过滤） */
  function groupKeys(prefix: string): string[] {
    return Object.keys(zh)
      .filter((key) => key.startsWith(`${prefix}.`))
      .map((key) => key.slice(prefix.length + 1))
      .sort()
  }

  it('错误 / 业务 / 字段三组与契约里的码一一对应', () => {
    expect(groupKeys('error')).toEqual([
      'conflict',
      'forbidden',
      'internal',
      'loadFailed',
      'notFound',
      'offline',
      'unauthorized',
      'unknown',
      'validation',
    ])
    expect(groupKeys('error')).toHaveLength(API_ERROR_CODES.length + 3)
    // 业务码只有失败：加一个成功用的默认文案
    expect(groupKeys('operation')).toHaveLength(OPERATION_CODES.length + 1)
    expect(groupKeys('field')).toHaveLength(VALIDATION_RULES.length)
    // 三组都是「一层到底」：没有多余嵌套
    for (const prefix of ['error', 'operation', 'field']) {
      expect(groupKeys(prefix).every((key) => !key.includes('.'))).toBe(true)
    }
    expect(API_ERROR_CODES).not.toContain('SUCCESS' as never)
    expect(OPERATION_CODES).not.toContain('SUCCESS' as never)
  })
})

describe('源码里不许写死文案', () => {
  it('组件、页面、store 里不出现中文（语言名与 style-lab 除外）', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC_ROOT)) {
      const relativePath = relative(SRC_ROOT, file)
      if (relativePath.startsWith('views/style-lab/')) continue
      if (relativePath === 'views/StyleLabView.vue') continue
      const cleaned = stripComments(readFileSync(file, 'utf-8')).replace(LANGUAGE_NAME_ALLOWED, '')
      cleaned.split('\n').forEach((line, index) => {
        if (CJK.test(line)) offenders.push(`${relativePath}:${index + 1} ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })

  it('浮层文案表（utils/feedback.ts）只认 i18n key，不写中文', () => {
    const cleaned = stripComments(readFileSync(join(SRC_ROOT, 'utils/feedback.ts'), 'utf-8'))
    expect(CJK.test(cleaned)).toBe(false)
    expect(cleaned).toContain('i18n.global.t')
  })
})
