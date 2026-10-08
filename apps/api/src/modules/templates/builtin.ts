import type { MessageTemplate } from '@kestrel/contracts'

/** 内置模板的 id：内容与名称都在代码里，界面上只读 */
export const BUILTIN_TEMPLATE_ID = 'builtin:default'

/** 内置模板的显示名走 i18n（前端按这个 key 翻译），不再给每种语言各来一套模板 */
export const BUILTIN_TEMPLATE_NAME_KEY = 'template.builtinDefault'

/** 默认模板正文：动作没挑模板时用它 */
export const DEFAULT_TEMPLATE_CONTENT = `{{badge}}【{{group}}】{{title}}
{{summary}}
来源 {{sourceCount}} 个：
{{sources}}
{{url}}
命中时间：{{hitAt}}`

export function builtinTemplates(): MessageTemplate[] {
  return [
    {
      id: BUILTIN_TEMPLATE_ID,
      name: '默认模板',
      nameKey: BUILTIN_TEMPLATE_NAME_KEY,
      content: DEFAULT_TEMPLATE_CONTENT,
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
  ]
}

/** 动作没选模板 / 选的模板被删了，都回落到这一套 */
export function defaultTemplateContent(): string {
  return DEFAULT_TEMPLATE_CONTENT
}
