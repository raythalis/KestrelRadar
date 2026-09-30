import type { Monitor, PreviewRequestInput, PreviewResult, PreviewSample } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { GroupRepo } from '../groups/group.repo.ts'
import type { Item, ItemRepo } from '../items/item.repo.ts'
import type { MonitorRepo } from '../monitors/monitor.repo.ts'
import type { SettingsService } from '../settings/settings.service.ts'
import { evaluateContent, resolveBands, type EffectiveRule, type Verdict } from './judge.ts'
import type { JudgmentRepo } from './judgment.repo.ts'
import { createUnavailableLlm, type JudgeLlm } from './llm.ts'

export interface JudgeDeps {
  monitors: MonitorRepo
  groups: GroupRepo
  discoveries: DiscoveryRepo
  items: ItemRepo
  judgments: JudgmentRepo
  settings: SettingsService
  llm?: JudgeLlm
  log?: (level: 'info' | 'warn', message: string) => void
}

const DEFAULT_SAMPLE_SIZE = 10
const SAMPLE_PREVIEW_COUNT = 3

export function createJudgeService(deps: JudgeDeps) {
  const llm = deps.llm ?? createUnavailableLlm()

  /** 监听卡片上的规则 → 判定用的规则：跟随全局的解析成具体模式，勾了就把全局排除词并进来 */
  function effectiveRule(monitor: Monitor): EffectiveRule {
    const settings = deps.settings.get()
    const mode = monitor.mode === 'follow_global' ? settings.judgeMode : monitor.mode
    const excludeKeywords = monitor.useGlobalExcludes
      ? [...new Set([...monitor.excludeKeywords, ...settings.globalExcludeKeywords])]
      : monitor.excludeKeywords
    return {
      mode,
      sensitivity: monitor.sensitivity,
      matchMode: monitor.matchMode,
      includeKeywords: monitor.includeKeywords,
      excludeKeywords,
      intentText: monitor.intentText.trim(),
    }
  }

  function content(item: Item) {
    return { title: item.title, summary: item.summary, url: item.url }
  }

  /**
   * 判定一条内容：
   * 算法先判；灰区（或在 LLM 模式下写了意图描述）才交模型。
   * 模型不通时按高级设置里的降级开关走：降级到纯算法 或 直接报错（这条这次不落判定，等下次再判）。
   */
  async function decide(
    item: Item,
    monitor: Monitor,
  ): Promise<{ verdict: Verdict; llmReason: string | null } | null> {
    const rule = effectiveRule(monitor)
    const bands = resolveBands(deps.settings.get(), rule.sensitivity)
    const verdict = evaluateContent(content(item), rule, bands)

    const wantsModel =
      rule.mode === 'algorithm_llm' &&
      verdict.decision === 'pass' &&
      (verdict.needsLlm || rule.intentText.length > 0)
    if (!wantsModel) return { verdict, llmReason: null }

    try {
      const result = await llm.review({
        intentText: rule.intentText,
        title: item.title,
        summary: item.summary,
        mode: rule.intentText.length > 0 ? 'intent' : 'gray_review',
      })
      return {
        verdict: {
          ...verdict,
          decision: result.decision === 'yes' ? 'pass' : 'drop',
          layer: 'llm',
          reasons: [
            ...verdict.reasons,
            `模型复核：${result.decision === 'yes' ? '是' : '否'}（${result.reason}）`,
          ],
        },
        llmReason: result.reason,
      }
    } catch (error) {
      const message = (error as Error).message || '未知错误'
      if (deps.settings.get().llmFallbackMode === 'error') {
        deps.log?.('warn', `模型判定失败，按设置不降级：${message}`)
        return null
      }
      return {
        verdict: {
          ...verdict,
          decision: 'pass',
          reasons: [...verdict.reasons, `模型不通，已降级为纯算法处理：${message}`],
        },
        llmReason: null,
      }
    }
  }

  return {
    /** 采集完之后把这条来源里「还没判过」的条目补判一遍；返回新写了多少条 */
    async judgePendingItems(discoveryId: string): Promise<number> {
      const discovery = deps.discoveries.get(discoveryId)
      if (!discovery) return 0
      const group = deps.groups.get(discovery.groupId)
      if (!group?.enabled) return 0

      const monitors = deps.monitors
        .list()
        .filter((monitor) => monitor.enabled && monitor.groupId === discovery.groupId)
      if (monitors.length === 0) return 0

      const items = deps.items.listByDiscovery(discoveryId)
      if (items.length === 0) return 0

      let written = 0
      for (const monitor of monitors) {
        const judged = deps.judgments.judgedItemIds(monitor.id)
        for (const item of items) {
          if (judged.has(item.id)) continue
          const outcome = await decide(item, monitor)
          if (!outcome) continue
          const inserted = deps.judgments.insert({
            itemId: item.id,
            monitorId: monitor.id,
            decision: outcome.verdict.decision,
            band: outcome.verdict.band,
            score: outcome.verdict.score,
            matchedKeywords: outcome.verdict.matchedKeywords,
            layer: outcome.verdict.layer,
            reasons: outcome.verdict.reasons,
            llmReason: outcome.llmReason,
          })
          if (inserted) written += 1
        }
      }
      return written
    },

    /**
     * 规则预览：拿这个分组最近采集到的内容试跑一遍。
     * 全程不写库，也**不调模型**（只算法判分），灰区里会不会走模型用 needsModel 提示。
     */
    async preview(monitorId: string, request: PreviewRequestInput): Promise<PreviewResult> {
      const monitor = deps.monitors.get(monitorId)
      if (!monitor) throw AppError.notFound('监听不存在')

      const base = effectiveRule(monitor)
      const override = request.rules
      const settings = deps.settings.get()
      const rule: EffectiveRule = override
        ? {
            mode: override.mode
              ? override.mode === 'follow_global'
                ? settings.judgeMode
                : override.mode
              : base.mode,
            sensitivity: override.sensitivity ?? base.sensitivity,
            matchMode: override.matchMode ?? base.matchMode,
            intentText:
              override.intentText !== undefined ? override.intentText.trim() : base.intentText,
            includeKeywords: override.includeKeywords ?? base.includeKeywords,
            excludeKeywords: override.useGlobalExcludes
              ? [
                  ...new Set([
                    ...(override.excludeKeywords ?? monitor.excludeKeywords),
                    ...settings.globalExcludeKeywords,
                  ]),
                ]
              : (override.excludeKeywords ?? base.excludeKeywords),
          }
        : base
      const bands = resolveBands(settings, rule.sensitivity)

      const sampleSize = request.sampleSize ?? DEFAULT_SAMPLE_SIZE
      const discoveries = deps.discoveries
        .list()
        .filter((discovery) => discovery.groupId === monitor.groupId)
      const items = discoveries
        .flatMap((discovery) => deps.items.listByDiscovery(discovery.id))
        .sort((left, right) =>
          (right.sourcePublishedAt ?? right.firstSeenAt).localeCompare(
            left.sourcePublishedAt ?? left.firstSeenAt,
          ),
        )
        .slice(0, sampleSize)

      let matched = 0
      let needsModel = false
      const samples: PreviewSample[] = []
      for (const item of items) {
        const verdict = evaluateContent(content(item), rule, bands)
        if (verdict.decision === 'pass') matched += 1
        if (verdict.needsLlm || (rule.mode === 'algorithm_llm' && rule.intentText.length > 0)) {
          needsModel = true
        }
        if (samples.length < SAMPLE_PREVIEW_COUNT) {
          samples.push({
            itemId: item.id,
            title: item.title,
            url: item.url,
            discoveryId: item.discoveryId,
            decision: verdict.decision,
            band: verdict.band,
            score: verdict.score,
            matchedKeywords: verdict.matchedKeywords,
            reasons: verdict.reasons,
          })
        }
      }

      return { total: items.length, matched, dropped: items.length - matched, needsModel, samples }
    },
  }
}

export type JudgeService = ReturnType<typeof createJudgeService>
