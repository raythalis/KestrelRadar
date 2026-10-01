import type { SettingKey } from '@kestrel/contracts'

/** 设置项描述：SettingsForm 按这个渲染，页面只管列字段 */
export interface SettingsField {
  key: SettingKey
  kind: 'number' | 'text' | 'select' | 'switch' | 'keywords'
  min?: number
  max?: number
  options?: { value: string; title: string }[]
}

/** 一张设置卡：同一件事的设置放一起，改完点这张卡的「保存」 */
export interface SettingsCard {
  id: string
  titleKey: string
  noteKey?: string
  fields: SettingsField[]
}
