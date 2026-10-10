import { isAbsolute } from 'node:path'

import { describe, expect, it } from 'vitest'

import { loggerOptions, type LoggerOption } from '../src/logging.ts'

function transportOf(options: LoggerOption): {
  target: string
  options: Record<string, unknown>
} {
  return (options as unknown as { transport: { target: string; options: Record<string, unknown> } })
    .transport
}

describe('运行期日志配置', () => {
  it('默认走 pino-pretty：级别名放行首、单行、本地时间带毫秒、带颜色', () => {
    const options = loggerOptions({})
    expect(options).not.toBe(false)
    const transport = transportOf(options)
    expect(transport.target).toContain('pino-pretty')
    expect(transport.options.levelFirst).toBe(true)
    expect(transport.options.singleLine).toBe(true)
    expect(transport.options.colorize).toBe(true)
    expect(transport.options.translateTime).toBe('SYS:yyyy-mm-dd HH:MM:ss.l')
    // pid/hostname 在容器里没有信息量（Dozzle 自己会标容器名）
    expect(transport.options.ignore).toBe('pid,hostname')
  })

  it('格式化器的路径是绝对路径，不依赖工作目录（容器里工作目录是仓库根）', () => {
    const target = transportOf(loggerOptions({})).target
    expect(isAbsolute(target)).toBe(true)
    expect(target).toContain('pino-pretty')
  })

  it('KESTREL_LOG=off 时彻底关日志', () => {
    expect(loggerOptions({ KESTREL_LOG: 'off' })).toBe(false)
  })

  it('颜色可以关掉（KESTREL_LOG_COLOR=0）', () => {
    expect(transportOf(loggerOptions({ KESTREL_LOG_COLOR: '0' })).options.colorize).toBe(false)
  })

  it('级别可以调，非法值退回 info', () => {
    expect(loggerOptions({ KESTREL_LOG_LEVEL: 'debug' })).toMatchObject({ level: 'debug' })
    expect(loggerOptions({ KESTREL_LOG_LEVEL: '啰嗦' })).toMatchObject({ level: 'info' })
    expect(loggerOptions({})).toMatchObject({ level: 'info' })
  })
})
