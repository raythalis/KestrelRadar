/** SQLite 与对外 JSON 之间的转换小工具：库内 snake_case，接口 camelCase */
export function nowIso(): string {
  return new Date().toISOString()
}

export function toBool(value: unknown): boolean {
  return value === 1 || value === true
}

export function fromBool(value: boolean): number {
  return value ? 1 : 0
}

export function parseStringArray(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw === '') return []
  const parsed: unknown = JSON.parse(raw)
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string')
    : []
}

export function parseStringRecord(raw: unknown): Record<string, string> {
  if (typeof raw !== 'string' || raw === '') return {}
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

export function parseJsonValue<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
