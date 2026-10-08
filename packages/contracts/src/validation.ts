import { z } from 'zod'

/**
 * 输入校验的公用件：长度上限一律与前端 maxlength 对齐，
 * 名称 / 短句一律先 trim 再判空，免得库里存进一串空格。
 */

/** 名称类：去掉首尾空格后必须还有内容 */
export function trimmedRequired(max: number) {
  return z.string().trim().min(1).max(max)
}

/** 自由文本（描述 / 意图 / 密钥）：去首尾空格，允许为空 */
export function trimmedText(max: number) {
  return z.string().trim().max(max)
}

/** http(s) 地址：去首尾空格、必须带协议、中间不许有空白 */
export function httpUrl(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine((value) => isHttpUrl(value), {
      message: HTTP_URL_MESSAGE,
      params: { rule: 'INVALID_URL' },
    })
}

/** 可为空的 http(s) 地址（设置项没配就是空串） */
export function optionalHttpUrl(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine((value) => value === '' || isHttpUrl(value), {
      message: HTTP_URL_MESSAGE,
      params: { rule: 'INVALID_URL' },
    })
}

/** 标签类数组：每一项 trim 后非空并限长，整体限个数 */
export function textList(itemMax: number, max: number) {
  return z.array(trimmedRequired(itemMax)).max(max)
}

export const HTTP_URL_MESSAGE = '必须是以 http:// 或 https:// 开头的地址，且不能带空格'

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim())
}

/** 发现的目标：rsshub 允许相对路由（/sspai/matrix），rss / web 必须是 http(s) 地址 */
export function isValidDiscoveryTarget(target: string, kind: 'rss' | 'rsshub' | 'web'): boolean {
  const value = target.trim()
  if (!value || /\s/.test(value)) return false
  if (isHttpUrl(value)) return true
  if (kind !== 'rsshub') return false
  // 相对路由：一个命名空间 + 若干段，允许 :参数 与点 / 连字符
  return /^\/?[\w.-]+(?:\/[\w.:@%-]+)*\/?$/.test(value)
}
