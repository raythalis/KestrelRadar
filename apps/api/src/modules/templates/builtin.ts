import { BUILTIN_TEMPLATE_IDS, type MessageTemplate } from '@kestrel/contracts'

/** 内置模板内容：中英各一套，动作没选模板时按界面语言用它 */
const BUILTIN_CONTENT: Record<'zh' | 'en', string> = {
  zh: [
    '{{badge}}【{{group}}】{{title}}',
    '{{summary}}',
    '来源 {{sourceCount}} 个：',
    '{{sources}}',
    '{{url}}',
    '命中时间：{{hitAt}}',
  ].join('\n'),
  en: [
    '{{badge}}[{{group}}] {{title}}',
    '{{summary}}',
    '{{sourceCount}} sources:',
    '{{sources}}',
    '{{url}}',
    'Seen at {{hitAt}}',
  ].join('\n'),
}

export function defaultTemplate(language: 'zh' | 'en'): string {
  return BUILTIN_CONTENT[language]
}

/** 内置模板列表：只读，界面照样列出来供选择 */
export function builtinTemplates(): MessageTemplate[] {
  return [
    {
      id: BUILTIN_TEMPLATE_IDS.zh,
      name: '系统内置 · 中文',
      content: BUILTIN_CONTENT.zh,
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: BUILTIN_TEMPLATE_IDS.en,
      name: '系统内置 · 英文',
      content: BUILTIN_CONTENT.en,
      builtin: true,
      createdAt: null,
      updatedAt: null,
    },
  ]
}
