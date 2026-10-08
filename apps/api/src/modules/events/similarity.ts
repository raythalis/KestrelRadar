import { normalizeUrl } from '../collection/fingerprint.ts'

export { normalizeUrl }

/** 内容相似到什么程度才敢并进同一个事件：宁可漏并，也不硬并 */
export const MERGE_SIMILARITY = 0.7
/** 相似内容比较的时间窗口：超过这个距离就不考虑并了 */
export const MERGE_WINDOW_HOURS = 72
/** 太短的标题（「快讯」之类）不参与相似比较，免得乱并 */
export const MIN_TITLE_LENGTH_FOR_SIMILARITY = 6

/** 出现这些词算「明确的新进展」，允许已投递的事件再推一次 */
const PROGRESS_KEYWORDS = [
  '发布',
  '上线',
  '开源',
  '停服',
  '下线',
  '涨价',
  '降价',
  '收购',
  '漏洞',
  '修复',
  '定档',
  '开售',
  '公测',
  '正式版',
  '已确定',
]

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/
const TOKEN_SPLIT = /[^a-z0-9\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g

/**
 * 把标题切成可比较的记号：拉丁词按词切，中日韩按「双字」切。
 * 双字比单字更能体现「说的是同一件事」，单字容易把不同的事算得像。
 */
function tokenize(text: string): Set<string> {
  const lowered = text.toLowerCase()
  const tokens = new Set<string>()
  for (const word of lowered.split(TOKEN_SPLIT)) {
    if (word.length >= 2 && !CJK_PATTERN.test(word)) tokens.add(word)
  }
  const cjk = (lowered.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []).join(
    '',
  )
  for (let index = 0; index + 1 < cjk.length; index += 1) {
    tokens.add(cjk.slice(index, index + 2))
  }
  return tokens
}

/** 标题相似度：Jaccard（交集 / 并集），0 到 1 */
export function titleSimilarity(left: string, right: string): number {
  const first = tokenize(left.trim())
  const second = tokenize(right.trim())
  if (first.size === 0 || second.size === 0) return 0
  let shared = 0
  for (const token of first) {
    if (second.has(token)) shared += 1
  }
  return shared / (first.size + second.size - shared)
}

/** 够相似才并：标题太短的一律不并 */
export function isSimilarEnough(left: string, right: string): boolean {
  const first = left.trim()
  const second = right.trim()
  if (first.length < MIN_TITLE_LENGTH_FOR_SIMILARITY) return false
  if (second.length < MIN_TITLE_LENGTH_FOR_SIMILARITY) return false
  return titleSimilarity(first, second) >= MERGE_SIMILARITY
}

/** 新的版本号也算进展（例如 v1.2.0、2.0.1） */
export function hasNewVersionNumber(text: string): boolean {
  return /\bv?\d+\.\d+(?:\.\d+)?\b/.test(text)
}

/** 这段内容里出现了哪些进展信号词（用来跟事件里已有的内容比对，只有「新出现的」才算进展） */
export function progressSignals(text: string): string[] {
  const lowered = text.toLowerCase()
  return PROGRESS_KEYWORDS.filter((word) => lowered.includes(word))
}
