/** 时间显示：界面上统一「本地时区 + 年月日时分」，没有值就显示占位符 */
export function templateDisplayName(
  template: { name: string; nameKey: string | null },
  translate: (key: string) => string,
): string {
  return template.nameKey ? translate(template.nameKey) : template.name
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** 紧凑时间：卡片这类窄位置用「月-日 时:分」，本地时区；没有值返回空串（让调用方决定要不要占位） */
export function formatShortDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
