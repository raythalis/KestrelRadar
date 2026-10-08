import { describe, expect, it } from 'vitest'

import type { Bands, EffectiveRule, ContentSignals } from '../src/modules/judgment/judge.ts'
import { evaluateContent, resolveBands } from '../src/modules/judgment/judge.ts'

const bands: Bands = { high: 65, low: 35 }

function rule(overrides: Partial<EffectiveRule> = {}): EffectiveRule {
  return {
    mode: 'algorithm',
    sensitivity: 'medium',
    matchMode: 'any',
    includeKeywords: [],
    excludeKeywords: [],
    intentText: '',
    ...overrides,
  }
}

function content(overrides: Partial<ContentSignals> = {}): ContentSignals {
  return {
    title: 'OpenAI 发布新的开源模型',
    summary: 'OpenAI 今天发布了一个新的开源模型，权重已经放到网上，任何人都可以下载使用。',
    url: 'https://example.com/post/1',
    ...overrides,
  }
}

describe('判定：三档灵敏度各用自己那两条线', () => {
  const settings = {
    scoreHighLine: 65,
    scoreLowLine: 35,
    looseHighLine: 55,
    looseLowLine: 25,
    strictHighLine: 80,
    strictLowLine: 45,
  }

  it('中等档用全局那两条线', () => {
    expect(resolveBands(settings, 'medium')).toEqual({ high: 65, low: 35 })
  })

  it('宽松档线更低（更容易过），严格档线更高（更难过）', () => {
    expect(resolveBands(settings, 'low')).toEqual({ high: 55, low: 25 })
    expect(resolveBands(settings, 'high')).toEqual({ high: 80, low: 45 })
  })

  it('两条线贴太近时低线让位，保证至少差 5 分', () => {
    const tight = { ...settings, strictHighLine: 48, strictLowLine: 46 }
    expect(resolveBands(tight, 'high')).toEqual({ high: 48, low: 43 })
  })
})

describe('判定：第一层关键词门槛', () => {
  it('没填关键词就是全部通过，分数落在灰区', () => {
    const verdict = evaluateContent(content(), rule(), bands)
    expect(verdict.layer).toBe('score')
    expect(verdict.band).toBe('gray')
    expect(verdict.decision).toBe('pass')
    expect(verdict.reasons.join(' ')).toContain('没填关键词')
  })

  it('任意命中（默认）：命中一个就算过门槛', () => {
    const verdict = evaluateContent(
      content({ title: '别的东西', summary: '这里只出现了开源两个字' }),
      rule({ includeKeywords: ['开源', '量子计算'] }),
      bands,
    )
    expect(verdict.layer).toBe('score')
    expect(verdict.matchedKeywords).toContain('开源')
    expect(verdict.matchedKeywords).not.toContain('量子计算')
  })

  it('全部命中：缺一个就丢掉，并说清缺哪个', () => {
    const verdict = evaluateContent(
      content({ title: 'OpenAI 发布', summary: '只有这一个词' }),
      rule({ includeKeywords: ['OpenAI', '量子计算'], matchMode: 'all' }),
      bands,
    )
    expect(verdict.decision).toBe('drop')
    expect(verdict.layer).toBe('keywords')
    expect(verdict.reasons.join(' ')).toContain('量子计算')
  })

  it('大小写不敏感', () => {
    const verdict = evaluateContent(
      content({ title: 'openai 的动态', summary: '正文' }),
      rule({ includeKeywords: ['OpenAI'] }),
      bands,
    )
    expect(verdict.matchedKeywords).toEqual(['OpenAI'])
  })
})

describe('判定：排除词单独一层', () => {
  it('命中排除词直接丢掉，理由写明是哪个词', () => {
    const verdict = evaluateContent(
      content({ title: '转发抽奖：免费领模型', summary: '关注并转发即可参与抽奖' }),
      rule({ includeKeywords: ['模型'], excludeKeywords: ['抽奖'] }),
      bands,
    )
    expect(verdict.decision).toBe('drop')
    expect(verdict.layer).toBe('excludes')
    expect(verdict.reasons.join(' ')).toContain('抽奖')
  })

  it('排除词先于打分：排除词命中的内容连分都不算', () => {
    const verdict = evaluateContent(
      content({ title: 'OpenAI 开源模型 抽奖', summary: '抽奖' }),
      rule({ includeKeywords: ['OpenAI'], excludeKeywords: ['抽奖'] }),
      bands,
    )
    expect(verdict.score).toBe(0)
  })
})

describe('判定：打分三档', () => {
  it('关键词全覆盖 + 标题命中 → 高分直接放行', () => {
    const verdict = evaluateContent(
      content(),
      rule({ includeKeywords: ['OpenAI', '开源', '模型'] }),
      bands,
    )
    expect(verdict.band).toBe('high')
    expect(verdict.decision).toBe('pass')
    expect(verdict.score).toBeGreaterThanOrEqual(65)
    expect(verdict.reasons.join(' ')).toContain('高分')
  })

  it('只擦到一个词、内容还很短 → 低分直接丢掉', () => {
    const verdict = evaluateContent(
      content({ title: '随手一贴', summary: '模型' }),
      rule({ includeKeywords: ['模型', '权重', '推理', '部署', '微调'] }),
      bands,
    )
    expect(verdict.band).toBe('low')
    expect(verdict.decision).toBe('drop')
    expect(verdict.reasons.join(' ')).toContain('低分')
  })

  it('灰区在纯算法模式下保守放行（宁可多推，不可漏）', () => {
    const verdict = evaluateContent(
      content({
        title: '关于模型的讨论',
        summary: '一段中等长度的正文内容，刚好超过二十个字的门槛。',
      }),
      rule({ includeKeywords: ['模型', '开源', '权重'] }),
      bands,
    )
    expect(verdict.band).toBe('gray')
    expect(verdict.decision).toBe('pass')
    expect(verdict.needsLlm).toBe(false)
    expect(verdict.reasons.join(' ')).toContain('灰区')
  })

  it('算法 + LLM 模式下灰区交给模型复核', () => {
    const verdict = evaluateContent(
      content({
        title: '关于模型的讨论',
        summary: '一段中等长度的正文内容，刚好超过二十个字的门槛。',
      }),
      rule({ mode: 'algorithm_llm', includeKeywords: ['模型', '开源', '权重'] }),
      bands,
    )
    expect(verdict.band).toBe('gray')
    expect(verdict.needsLlm).toBe(true)
  })

  it('灵敏度会真的改变落档：宽松把线压低，同一内容从灰区提到高分', () => {
    const signals = content({
      title: '关于模型的讨论',
      summary: '一段中等长度的正文内容，刚好超过二十个字的门槛。',
    })
    const rules = rule({ includeKeywords: ['模型', '开源', '权重'] })
    expect(evaluateContent(signals, rules, { high: 55, low: 25 }).band).toBe('high')
    expect(evaluateContent(signals, rules, { high: 65, low: 35 }).band).toBe('gray')
  })

  it('灵敏度会真的改变落档：严格把线抬高，弱内容被丢下去', () => {
    const weak = content({
      title: '随手一贴',
      summary: '一段中等长度的正文内容，只出现了一个词：模型。',
    })
    const rules = rule({ includeKeywords: ['模型', '权重', '推理', '部署', '微调', '蒸馏'] })
    expect(evaluateContent(weak, rules, { high: 65, low: 35 }).band).toBe('gray')
    expect(evaluateContent(weak, rules, { high: 75, low: 45 }).band).toBe('low')
  })

  it('标题命中比正文命中分高', () => {
    const inTitle = evaluateContent(
      content({ title: '开源模型来了', summary: '正文里没有那些词' }),
      rule({ includeKeywords: ['开源'] }),
      bands,
    )
    const inBody = evaluateContent(
      content({ title: '别的标题', summary: '正文里顺带提了一句开源' }),
      rule({ includeKeywords: ['开源'] }),
      bands,
    )
    expect(inTitle.score).toBeGreaterThan(inBody.score)
  })

  it('发布时间不参与判定：只差时间的两条内容同分', () => {
    const rules = rule({ includeKeywords: ['OpenAI'] })
    const first = evaluateContent(content(), rules, bands)
    const second = evaluateContent(
      content({ title: 'OpenAI 发布新的开源模型', summary: content().summary }),
      rules,
      bands,
    )
    expect(second.score).toBe(first.score)
  })

  it('同一输入永远同一输出（可复现）', () => {
    const rules = rule({ includeKeywords: ['OpenAI', '开源'] })
    const verdicts = Array.from({ length: 5 }, () => evaluateContent(content(), rules, bands))
    expect(new Set(verdicts.map((v) => v.score)).size).toBe(1)
    expect(new Set(verdicts.map((v) => JSON.stringify(v.reasons))).size).toBe(1)
  })
})
