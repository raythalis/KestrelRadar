import { describe, expect, it } from 'vitest'

import { effectiveMonitorMode, monitorModeView } from '@/components/biz/monitor-mode'

const t = (key: string): string =>
  ({
    'monitor.mode.follow_global': '跟随全局',
    'monitor.mode.algorithm': '自带算法',
    'monitor.mode.algorithm_llm': 'LLM+',
  })[key] ?? key

describe('monitorModeView', () => {
  it('跟随全局：把生效的那档写出来，LLM+ 那档只给空文字（名字由组件画）', () => {
    expect(monitorModeView('follow_global', 'algorithm', t)).toEqual({
      label: '跟随全局 · 自带算法',
      llmPlus: false,
    })
    expect(monitorModeView('follow_global', 'algorithm_llm', t)).toEqual({
      label: '跟随全局 · ',
      llmPlus: true,
    })
  })

  it('自带档位：算法给文字，LLM+ 给空文字加标记', () => {
    expect(monitorModeView('algorithm', 'algorithm_llm', t)).toEqual({
      label: '自带算法',
      llmPlus: false,
    })
    expect(monitorModeView('algorithm_llm', 'algorithm', t)).toEqual({
      label: '',
      llmPlus: true,
    })
  })

  it('实际生效档位：跟随全局取全局，其余取自己', () => {
    expect(effectiveMonitorMode('follow_global', 'algorithm_llm')).toBe('algorithm_llm')
    expect(effectiveMonitorMode('algorithm', 'algorithm_llm')).toBe('algorithm')
  })
})
