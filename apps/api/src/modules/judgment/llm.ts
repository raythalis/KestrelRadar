export interface JudgeLlmInput {
  /** 监听上写的意图描述，灰区复核时为空 */
  intentText: string
  title: string
  summary: string
  /** gray_review = 灰区复核（回是/否），intent = 语义化意图判断 */
  mode: 'gray_review' | 'intent'
}

export interface JudgeLlmResult {
  decision: 'yes' | 'no'
  reason: string
}

/** 判定用的模型接口。v1.0 只有灰区复核与意图判断两处会用到它。 */
export interface JudgeLlm {
  review(input: JudgeLlmInput): Promise<JudgeLlmResult>
}

export class JudgeLlmUnavailableError extends Error {}

/**
 * M3 只留接口：还没接任何模型供应商。
 * 真被调用时明确报「没配模型」，让上层的降级开关去决定怎么办。
 */
export function createUnavailableLlm(): JudgeLlm {
  return {
    review: async () => {
      throw new JudgeLlmUnavailableError('还没有配置可用的判定模型')
    },
  }
}
