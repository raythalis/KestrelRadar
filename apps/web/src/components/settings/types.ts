import type { SettingKey } from '@kestrel/contracts'

/** 设置项描述：SettingsForm 按这个渲染，页面只管列字段 */
export interface SettingsField {
  key: SettingKey | 'locale'
  /** 同一张卡里同一个 key 出现多次时，用它区分渲染身份 */
  id?: string
  kind:
    | 'number'
    | 'text'
    | 'select'
    | 'switch'
    | 'keywords'
    | 'scoreBands'
    | 'rsshubTest'
    | 'locale'
    /** 危险操作按钮（重置全局设置）；key 只是占位，不会写回设置 */
    | 'reset'
  /** 覆盖默认的 settings.field.<key>；给空串表示这一行不显示标签/说明 */
  labelKey?: string
  hintKey?: string
  /** 区间类控件（scoreBands）的低分线字段名，不填就是 scoreLowLine */
  lowKey?: SettingKey
  min?: number
  max?: number
  /** 选项；title 是文字，llmPlus 的那档由 LlmPlusTag 画名字与图标 */
  options?: { value: string; title: string; llmPlus?: boolean }[]
}

/** 一张设置卡：同一件事的设置放一起，改动即自动保存 */
export interface SettingsCard {
  id: string
  titleKey: string
  noteKey?: string
  fields: SettingsField[]
}
