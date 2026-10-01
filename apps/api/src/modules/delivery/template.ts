import type { Event, EventMember } from '../events/event.repo.ts'

export interface TemplateInput {
  groupName: string
  event: Event
  members: EventMember[]
  /** 这条消息里装了几个事件 */
  eventCount: number
  language: 'zh' | 'en'
  /** 设置里的时区，system 表示跟随服务器 */
  timezone: string
}

function formatInTimeZone(iso: string | null, timezone: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }
  if (timezone && timezone !== 'system') options.timeZone = timezone
  try {
    return new Intl.DateTimeFormat('zh-CN', options).format(date).replace(/\//g, '-')
  } catch {
    return new Intl.DateTimeFormat('zh-CN', { ...options, timeZone: undefined }).format(date)
  }
}

/** 摘要取第一条成员的正文，压成一行、最多 120 字 */
function summarize(members: EventMember[]): string {
  const first = members[0]
  if (!first) return ''
  const text = first.summary.replace(/\s+/g, ' ').trim()
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

function renderSources(members: EventMember[], language: 'zh' | 'en'): string {
  if (members.length === 0) return ''
  const joiner = language === 'zh' ? '：' : ': '
  const noLink = language === 'zh' ? '（没有链接）' : '(no link)'
  return members
    .map((member) => `- ${member.discoveryName}${joiner}${member.url ?? noLink}`)
    .join('\n')
}

/**
 * 模板语法（v1.0）：用 {{变量}} 占位，认得的变量就替换，
 * 不认得的原样留着，方便一眼看出写错了哪个。
 * 变量：{{title}} 事件标题、{{summary}} 摘要、{{url}} 原文链接、{{sourceCount}} 来源数量、
 * {{sources}} 来源列表、{{hitAt}} 命中时间、{{group}} 分组名、{{badge}} 有更新标记、
 * {{eventCount}} 这条消息里的事件数。
 */
export function renderTemplate(template: string, input: TemplateInput): string {
  const badge =
    input.event.status === 'updated' ? (input.language === 'zh' ? '有更新 ' : 'Update ') : ''
  const values: Record<string, string> = {
    title: input.event.title,
    summary: summarize(input.members),
    url: input.event.url ?? '',
    sourceCount: String(input.event.sourceCount),
    sources: renderSources(input.members, input.language),
    hitAt: formatInTimeZone(input.event.firstItemAt, input.timezone),
    group: input.groupName,
    badge,
    eventCount: String(input.eventCount),
  }
  const rendered = template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, name: string) =>
    name in values ? (values[name] ?? '') : match,
  )
  return rendered
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
