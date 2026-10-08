/**
 * 判定模式在界面上的写法：只有这一处拼「跟随全局 · xxx」。
 * 「LLM+」那档不给文字，名字与星芒图标由 LlmPlusTag 出，免得两处各写一遍。
 */

export type MonitorMode = 'follow_global' | 'algorithm' | 'algorithm_llm'

export interface MonitorModeView {
  /** 模式文字；LLM+ 那档是空串 */
  label: string
  /** 这一条实际生效的是不是 LLM+（跟随全局时看全局那一档） */
  llmPlus: boolean
}

/** 一条监听实际生效的判定档位：跟随全局就取全局那一档 */
export function effectiveMonitorMode(
  mode: MonitorMode,
  globalMode: 'algorithm' | 'algorithm_llm',
): 'algorithm' | 'algorithm_llm' {
  return mode === 'follow_global' ? globalMode : mode
}

export function monitorModeView(
  mode: MonitorMode,
  globalMode: 'algorithm' | 'algorithm_llm',
  t: (key: string) => string,
): MonitorModeView {
  const effective = effectiveMonitorMode(mode, globalMode)
  return {
    // 跟随全局时把生效的那档也写出来：「跟随全局 · 自带算法」「跟随全局 · LLM+」
    label:
      mode === 'follow_global'
        ? `${t('monitor.mode.follow_global')} · ${
            effective === 'algorithm' ? t('monitor.mode.algorithm') : ''
          }`
        : effective === 'algorithm_llm'
          ? ''
          : t(`monitor.mode.${mode}`),
    llmPlus: effective === 'algorithm_llm',
  }
}
