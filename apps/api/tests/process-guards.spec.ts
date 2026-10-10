import type { FastifyInstance } from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { registerProcessGuards } from '../src/process-guards.ts'

interface FakeSource {
  on(event: string, handler: (...args: unknown[]) => void): FakeSource
  emit(event: string, ...args: unknown[]): void
}

function createSource(): FakeSource {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>()
  return {
    on(event, handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler])
      return this
    },
    emit(event, ...args) {
      for (const handler of handlers.get(event) ?? []) handler(...args)
    },
  }
}

interface FakeAppState {
  closed: number
  lines: string[]
  closeThrows: boolean
}

function createApp(): { app: FastifyInstance; state: FakeAppState } {
  const state: FakeAppState = { closed: 0, lines: [], closeThrows: false }
  const record =
    (level: string) =>
    (...args: unknown[]): void => {
      // pino 两种调用都支持：log.info(msg) 与 log.info(fields, msg)
      const message = typeof args[0] === 'string' ? args[0] : (args[1] as string | undefined)
      state.lines.push(`${level}:${message ?? ''}`)
    }
  const app = {
    close: async (): Promise<void> => {
      state.closed += 1
      if (state.closeThrows) throw new Error('close failed')
    },
    log: {
      info: record('info'),
      warn: record('warn'),
      error: record('error'),
      fatal: record('fatal'),
    },
  } as unknown as FastifyInstance
  return { app, state }
}

describe('进程级兜底与优雅停机', () => {
  it('SIGTERM：先关服务，记一行已停止，退出码 0', async () => {
    const { app, state } = createApp()
    const exit = vi.fn()
    const source = createSource()
    registerProcessGuards({ app, source, exit })

    source.emit('SIGTERM')

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0))
    expect(state.closed).toBe(1)
    expect(state.lines.some((line) => line.startsWith('info:收到停止信号（SIGTERM）'))).toBe(true)
    expect(state.lines.some((line) => line.includes('已停止（'))).toBe(true)
  })

  it('连着来两个信号：只关一次、只退一次', async () => {
    const { app, state } = createApp()
    const exit = vi.fn()
    const source = createSource()
    registerProcessGuards({ app, source, exit })

    source.emit('SIGINT')
    source.emit('SIGTERM')

    await vi.waitFor(() => expect(exit).toHaveBeenCalledTimes(1))
    expect(state.closed).toBe(1)
  })

  it('未处理的异步失败：记 error 但进程继续，不关服务也不退出', async () => {
    const { app, state } = createApp()
    const exit = vi.fn()
    const source = createSource()
    registerProcessGuards({ app, source, exit })

    source.emit('unhandledRejection', new Error('boom'))

    await vi.waitFor(() => expect(state.lines.length).toBeGreaterThan(0))
    expect(state.lines[0]).toContain('error:未处理的异步失败')
    expect(state.lines[0]).toContain('已忽略，服务继续')
    expect(exit).not.toHaveBeenCalled()
    expect(state.closed).toBe(0)
  })

  it('未捕获异常：记 fatal、尽力关服务、退出码 1', async () => {
    const { app, state } = createApp()
    const exit = vi.fn()
    const source = createSource()
    registerProcessGuards({ app, source, exit })

    source.emit('uncaughtException', new Error('boom'))

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1))
    expect(state.lines[0]).toContain('fatal:未捕获的异常')
    expect(state.lines[0]).toContain('boom')
    expect(state.closed).toBe(1)
  })

  it('关服务本身报错：记一条 error，仍然退出', async () => {
    const { app, state } = createApp()
    state.closeThrows = true
    const exit = vi.fn()
    const source = createSource()
    registerProcessGuards({ app, source, exit })

    source.emit('SIGTERM')

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0))
    expect(state.lines.some((line) => line.includes('停止时出错'))).toBe(true)
    expect(state.lines.some((line) => line.includes('已停止（'))).toBe(true)
  })

  it('字符串或非 Error 的拒绝原因也能记成人话', async () => {
    const { app, state } = createApp()
    const source = createSource()
    registerProcessGuards({ app, source, exit: vi.fn() })

    source.emit('unhandledRejection', 'socket hang up')

    await vi.waitFor(() => expect(state.lines.length).toBeGreaterThan(0))
    expect(state.lines[0]).toContain('socket hang up')
  })
})
