import type { MatchMode, Sensitivity, Settings } from '@kestrel/contracts'

/** 判定用的内容信号：只有这三样，判定不看时间 */
export interface ContentSignals {
  title: string
  summary: string
  url: string | null
}

/** 一条监听的规则（mode 已经解析过，不会是 follow_global） */
export interface EffectiveRule {
  mode: 'algorithm' | 'algorithm_llm'
  sensitivity: Sensitivity
  matchMode: MatchMode
  includeKeywords: string[]
  excludeKeywords: string[]
  intentText: string
}

export interface Bands {
  high: number
  low: number
}

export interface Verdict {
  decision: 'pass' | 'drop'
  band: 'high' | 'gray' | 'low'
  score: number
  /** 结论定在哪一层；'llm' 表示算法判完又过了一遍模型 */
  layer: 'keywords' | 'excludes' | 'score' | 'llm'
  matchedKeywords: string[]
  reasons: string[]
  /** 灰区 + 算法 LLM 模式：交给模型复核 */
  needsLlm: boolean
}

/**
 * 打分用的固定权重，全部可解释，一条条能对上：
 * - 关键词覆盖（命中几个 / 共几个）：最多 +55
 * - 标题命中：每个 +5，最多 +15
 * - 多个关键词在正文里连在一起出现（短语）：+8
 * - 正文完整（≥120 字）：+8；正文很短（<20 字）：-12
 * - 没有链接：-4
 * 底层 35 分起步，没填关键词时给中性分 50（落在灰区，纯算法模式放行）。
 * 发布时间不参与判定（它只影响排序），免得抓得慢的源被误杀。
 */
const BASE_SCORE = 35
const NEUTRAL_SCORE = 50
const COVERAGE_WEIGHT = 55
const TITLE_BONUS = 5
const TITLE_BONUS_CAP = 15
const PHRASE_BONUS = 8
const LONG_SUMMARY_BONUS = 8
const LONG_SUMMARY_LENGTH = 120
const SHORT_SUMMARY_PENALTY = 12
const SHORT_SUMMARY_LENGTH = 20
const NO_URL_PENALTY = 4
const PHRASE_CHECK_LIMIT = 10

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 灵敏度映射到全局那两条线：宽松往低让，严格往高抬 */
export function resolveBands(
  settings: Pick<Settings, 'scoreHighLine' | 'scoreLowLine' | 'sensitivityShift'>,
  sensitivity: Sensitivity,
): Bands {
  const shift =
    sensitivity === 'high'
      ? settings.sensitivityShift
      : sensitivity === 'low'
        ? -settings.sensitivityShift
        : 0
  const high = clamp(settings.scoreHighLine + shift, 5, 100)
  const low = clamp(Math.min(settings.scoreLowLine + shift, high - 5), 0, 99)
  return { high, low }
}

function normalize(text: string): string {
  return text.toLowerCase()
}

function contains(haystack: string, needle: string): boolean {
  const target = normalize(needle.trim())
  return target.length > 0 && normalize(haystack).includes(target)
}

/** 多个命中词连在一起出现（例如「开源模型」），比零散命中更可信 */
function hasAdjacentPair(text: string, matched: string[]): boolean {
  const words = matched.slice(0, PHRASE_CHECK_LIMIT).map((word) => normalize(word.trim()))
  for (const first of words) {
    for (const second of words) {
      if (first === second || first.length === 0 || second.length === 0) continue
      if (text.includes(`${first}${second}`)) return true
    }
  }
  return false
}

function decideBand(score: number, bands: Bands): 'high' | 'gray' | 'low' {
  if (score >= bands.high) return 'high'
  if (score <= bands.low) return 'low'
  return 'gray'
}

/**
 * 四层漏斗的前三层（来源范围在调用方筛掉）：
 * 排除词 → 关键词门槛 → 打分定档。
 * 纯函数：同样的输入永远同样的输出，不碰网络也不碰库。
 */
export function evaluateContent(
  content: ContentSignals,
  rule: EffectiveRule,
  bands: Bands,
): Verdict {
  const title = content.title ?? ''
  const summary = content.summary ?? ''
  const text = `${title}\n${summary}`

  const blocked = rule.excludeKeywords.filter((word) => contains(text, word))
  if (blocked.length > 0) {
    return {
      decision: 'drop',
      band: 'low',
      score: 0,
      layer: 'excludes',
      matchedKeywords: [],
      needsLlm: false,
      reasons: [`命中排除词：${blocked.join('、')}，直接丢掉`],
    }
  }

  const keywords = rule.includeKeywords.map((word) => word.trim()).filter((word) => word.length > 0)
  if (keywords.length === 0) {
    const score = NEUTRAL_SCORE
    return {
      decision: 'pass',
      band: decideBand(score, bands),
      score,
      layer: 'score',
      matchedKeywords: [],
      needsLlm: rule.mode === 'algorithm_llm' && rule.intentText.length > 0,
      reasons: [
        '没填关键词：全部通过',
        `分数 ${score}，落在灰区：${rule.mode === 'algorithm_llm' ? '交给模型复核' : '纯算法模式，保守放行'}`,
      ],
    }
  }

  const matched = keywords.filter((word) => contains(text, word))
  const missing = keywords.filter((word) => !matched.includes(word))

  if (rule.matchMode === 'all' && missing.length > 0) {
    return {
      decision: 'drop',
      band: 'low',
      score: 0,
      layer: 'keywords',
      matchedKeywords: matched,
      needsLlm: false,
      reasons: [`要求全部关键词都命中，缺：${missing.join('、')}`],
    }
  }

  if (matched.length === 0) {
    return {
      decision: 'drop',
      band: 'low',
      score: 0,
      layer: 'keywords',
      matchedKeywords: [],
      needsLlm: false,
      reasons: [`没命中任何关键词（${keywords.join('、')}）`],
    }
  }

  const reasons: string[] = []
  const coverage = matched.length / keywords.length
  let score = BASE_SCORE + Math.round(coverage * COVERAGE_WEIGHT)
  reasons.push(`命中关键词 ${matched.length}/${keywords.length}：${matched.join('、')}`)

  const inTitle = matched.filter((word) => contains(title, word))
  if (inTitle.length > 0) {
    score += Math.min(TITLE_BONUS_CAP, inTitle.length * TITLE_BONUS)
    reasons.push(`其中 ${inTitle.length} 个出现在标题里（标题命中更可信）`)
  }

  if (hasAdjacentPair(text, matched)) {
    score += PHRASE_BONUS
    reasons.push('多个命中词在正文里连在一起出现')
  }

  const summaryLength = summary.trim().length
  if (summaryLength >= LONG_SUMMARY_LENGTH) {
    score += LONG_SUMMARY_BONUS
    reasons.push('正文比较完整')
  } else if (summaryLength < SHORT_SUMMARY_LENGTH) {
    score -= SHORT_SUMMARY_PENALTY
    reasons.push('正文很短，信息量有限')
  }

  if (!content.url) {
    score -= NO_URL_PENALTY
    reasons.push('这条没有链接，回不到原文')
  }

  const finalScore = clamp(Math.round(score), 0, 100)
  const band = decideBand(finalScore, bands)

  if (band === 'high') {
    reasons.push(`分数 ${finalScore}，达到高分线 ${bands.high}：直接放行`)
  } else if (band === 'low') {
    reasons.push(`分数 ${finalScore}，低于低分线 ${bands.low}：丢掉`)
  } else {
    reasons.push(
      `分数 ${finalScore}，落在灰区（${bands.low + 1}–${bands.high - 1}）：${
        rule.mode === 'algorithm_llm' ? '交给模型复核' : '纯算法模式，保守放行'
      }`,
    )
  }

  return {
    decision: band === 'low' ? 'drop' : 'pass',
    band,
    score: finalScore,
    layer: 'score',
    matchedKeywords: matched,
    needsLlm: band === 'gray' && rule.mode === 'algorithm_llm',
    reasons,
  }
}
