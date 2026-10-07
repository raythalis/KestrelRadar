import type { JudgeLlm, JudgeLlmInput, JudgeLlmResult } from './llm.ts'
import { JudgeLlmUnavailableError } from './llm.ts'

/** 一个可以调的模型：模型名 + 它所属供应商的地址与密钥 */
export interface LlmTarget {
  modelId: string
  modelName: string
  providerName: string
  baseUrl: string
  apiKey: string | null
}

export interface ProviderLlmDeps {
  /** 当前的调用顺序；每次调用现取，改完设置立刻生效 */
  targets: () => LlmTarget[]
  /** 单次请求最多等多久（秒） */
  timeoutSeconds: () => number
  /** 同一个模型失败后重试几次 */
  maxRetries: () => number
  fetchImpl?: typeof fetch
  log?: (level: 'info' | 'warn', message: string) => void
}

const SYSTEM_PROMPT =
  '你是内容判定器。只看这条内容本身，判断它是否值得保留。' +
  '只输出一个 JSON 对象，形如 {"decision":"yes","reason":"一句话理由"}，不要输出任何别的字。'

/** 供应商给的地址可能带 /v1，也可能不带，统一拼成 OpenAI 兼容的对话接口 */
function chatUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`
}

function userPrompt(input: JudgeLlmInput): string {
  const lines: string[] = []
  if (input.mode === 'intent') {
    lines.push('判断这条内容是否符合下面的关注意图：符合回答 yes，不符合回答 no。')
    if (input.intentText.length > 0) lines.push(`关注意图：${input.intentText}`)
  } else {
    lines.push('判断这条内容是否值得保留：值得回答 yes，不值得回答 no。')
  }
  lines.push(`标题：${input.title || '（没有标题）'}`)
  lines.push(`摘要：${input.summary || '（没有摘要）'}`)
  return lines.join('\n')
}

/** 模型回话里可能带解释或代码块围栏，只抠那个 JSON 对象 */
export function parseLlmAnswer(raw: string): JudgeLlmResult {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型没有按要求返回 JSON')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { decision?: unknown; reason?: unknown }
  const decision = typeof parsed.decision === 'string' ? parsed.decision.trim().toLowerCase() : ''
  if (decision !== 'yes' && decision !== 'no') throw new Error('模型没有回答 yes / no')
  const reason =
    typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
      ? parsed.reason.trim()
      : '模型没有给理由'
  return { decision, reason }
}

/**
 * 真正去调模型的实现。顺序与重试的全部规则：
 * 取顺序里第 1 个模型 → 单次请求超时就掐断、算这次失败 → 失败重试到 maxRetries 次 →
 * 仍然不通才轮到下一个模型 → 顺序全试完还不行就抛给上层，由降级开关决定兜底。
 */
export function createProviderLlm(deps: ProviderLlmDeps): JudgeLlm {
  const doFetch = deps.fetchImpl ?? fetch

  async function callOnce(
    target: LlmTarget,
    input: JudgeLlmInput,
    timeoutMs: number,
  ): Promise<JudgeLlmResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await doFetch(chatUrl(target.baseUrl), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(target.apiKey ? { authorization: `Bearer ${target.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: target.modelName,
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt(input) },
          ],
        }),
      })
      if (!response.ok) throw new Error(`供应商返回 HTTP ${response.status}`)
      const payload = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[]
      }
      const content = payload.choices?.[0]?.message?.content
      if (typeof content !== 'string') throw new Error('模型没有返回内容')
      return parseLlmAnswer(content)
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`模型超过 ${Math.round(timeoutMs / 1000)} 秒没响应`)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    async review(input: JudgeLlmInput): Promise<JudgeLlmResult> {
      const targets = deps.targets()
      if (targets.length === 0) {
        throw new JudgeLlmUnavailableError('还没有配置可用的判定模型')
      }

      const attempts = Math.max(0, deps.maxRetries()) + 1
      const timeoutMs = Math.max(1, deps.timeoutSeconds()) * 1000
      let lastError: Error | null = null

      for (const target of targets) {
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          try {
            return await callOnce(target, input, timeoutMs)
          } catch (error) {
            lastError = error as Error
            deps.log?.(
              'warn',
              `模型 ${target.providerName}/${target.modelName} 第 ${attempt}/${attempts} 次不通：${lastError.message}`,
            )
          }
        }
      }

      throw lastError ?? new Error('模型调用失败')
    },
  }
}
