import { describe, expect, it } from 'vitest'

import {
  describeFailure,
  outboundLine,
  safeTarget,
  statusCopy,
  tracedFetch,
  warnOnly,
  type OutboundLog,
} from '../src/outbound.ts'

function recorder(): { lines: string[]; log: OutboundLog } {
  const lines: string[] = []
  return {
    lines,
    log: (level, message) => lines.push(`${level}:${message}`),
  }
}

describe('出站地址写法', () => {
  it('只留域名与路径：查询串一律丢掉（密钥常在那里）', () => {
    expect(safeTarget('https://hnrss.org/frontpage?key=SECRET&limit=20')).toBe(
      'https://hnrss.org/frontpage',
    )
    expect(safeTarget('https://rsshub.app/api/namespace/sspai?key=abc')).toBe(
      'https://rsshub.app/api/namespace/sspai',
    )
  })

  it('路径里的凭据也抹掉：Telegram 的 bot token、一长串随机字符', () => {
    expect(safeTarget('https://api.telegram.org/bot123456:ABC-DEF/sendMessage')).toBe(
      'https://api.telegram.org/bot***/sendMessage',
    )
    expect(safeTarget('https://example.com/feed/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6')).toBe(
      'https://example.com/feed/***',
    )
  })

  it('不认识的字符串：至少把查询串切掉', () => {
    expect(safeTarget('not a url?token=1')).toBe('not a url')
  })
})

describe('状态码说人话', () => {
  it('常见错误码各有说法，正常码不说', () => {
    expect(statusCopy(200)).toBe('')
    expect(statusCopy(304)).toBe('')
    expect(statusCopy(400)).toBe('请求不对')
    expect(statusCopy(401)).toBe('认证失败')
    expect(statusCopy(403)).toBe('认证失败')
    expect(statusCopy(404)).toBe('目标不存在')
    expect(statusCopy(429)).toBe('被限流')
    expect(statusCopy(503)).toBe('对方出错')
  })
})

describe('出站一行', () => {
  it('成功：谁在发、方法、地址、状态、耗时', () => {
    const line = outboundLine({
      actor: '采集「HN 头条」',
      url: 'https://hnrss.org/frontpage',
      method: 'get',
      status: 200,
      durationMs: 1200,
    })
    expect(line.level).toBe('info')
    expect(line.message).toBe('采集「HN 头条」：GET https://hnrss.org/frontpage 200，用时 1.2 秒')
  })

  it('4xx/5xx 记 warn 并说人话', () => {
    const line = outboundLine({
      actor: '投递 Telegram',
      url: 'https://api.telegram.org/bot999:xyz/sendMessage',
      method: 'POST',
      status: 401,
      durationMs: 300,
    })
    expect(line.level).toBe('warn')
    expect(line.message).toBe(
      '投递 Telegram：POST https://api.telegram.org/bot***/sendMessage 401，认证失败，用时 0.3 秒',
    )
  })

  it('连不上：失败原因写清楚，仍然是 warn', () => {
    const line = outboundLine({
      actor: '判定',
      url: 'https://api.deepseek.com/v1/chat/completions',
      method: 'POST',
      failure: '超时',
      durationMs: 5000,
    })
    expect(line.level).toBe('warn')
    expect(line.message).toBe(
      '判定：POST https://api.deepseek.com/v1/chat/completions 失败：超时，用时 5.0 秒',
    )
  })

  it('非 HTTP 的对外动作：不说方法、没有状态码时只说完成', () => {
    const line = outboundLine({
      actor: '投递 邮件',
      url: 'smtp://smtp.example.com:465',
      method: '',
      durationMs: 1200,
    })
    expect(line.level).toBe('info')
    expect(line.message).toBe('投递 邮件：smtp://smtp.example.com:465 完成，用时 1.2 秒')
  })
})

describe('失败原因说人话', () => {
  it('超时、连不上、其余照搬原文', () => {
    expect(describeFailure(Object.assign(new Error('x'), { name: 'TimeoutError' }))).toBe('超时')
    expect(describeFailure(new Error('fetch failed'))).toBe('连不上')
    expect(describeFailure(new Error('ECONNREFUSED 127.0.0.1:9'))).toBe('连不上')
    expect(describeFailure(new Error('errcode 40001'))).toBe('errcode 40001')
    expect(describeFailure(undefined)).toBe('没说明原因')
  })
})

describe('包一次出站请求', () => {
  it('成功：响应原样返回，日志记一行', async () => {
    const { lines, log } = recorder()
    const response = new Response('ok', { status: 200 })
    const seen: string[] = []
    const doFetch = (async (url: string) => {
      seen.push(String(url))
      return response
    }) as unknown as typeof fetch

    const got = await tracedFetch(doFetch, log, '采集「HN」', 'https://example.com/feed')
    expect(got).toBe(response)
    expect(seen).toEqual(['https://example.com/feed'])
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^info:采集「HN」：GET https:\/\/example\.com\/feed 200，用时 \d/)
  })

  it('失败：错误原样抛出，日志记一行 warn', async () => {
    const { lines, log } = recorder()
    const boom = new Error('fetch failed')
    const doFetch = (async () => {
      throw boom
    }) as unknown as typeof fetch

    await expect(tracedFetch(doFetch, log, '采集「HN」', 'https://example.com/feed')).rejects.toBe(
      boom,
    )
    expect(lines).toEqual([
      'warn:采集「HN」：GET https://example.com/feed 失败：连不上，用时 0.0 秒',
    ])
  })

  it('没给日志口子就安安静静地发', async () => {
    const doFetch = (async () => new Response('', { status: 200 })) as unknown as typeof fetch
    const response = await tracedFetch(doFetch, undefined, '判定', 'https://example.com')
    expect(response.status).toBe(200)
  })
})

describe('后台请求只记失败', () => {
  it('成功丢掉、失败放行', () => {
    const { lines, log } = recorder()
    const filtered = warnOnly(log)
    filtered?.('info', '成功那行')
    filtered?.('warn', '失败那行')
    expect(lines).toEqual(['warn:失败那行'])
  })

  it('没给日志口子时返回空', () => {
    expect(warnOnly(undefined)).toBeUndefined()
  })
})
