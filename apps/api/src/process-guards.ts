import type { FastifyInstance } from 'fastify'

/** 进程事件源：真实进程，或测试里的假发射器 */
export interface ProcessEventSource {
  on(event: string, handler: (...args: unknown[]) => void): unknown
}

export interface ProcessGuardOptions {
  app: FastifyInstance
  /** 默认监听当前进程；测试注入假发射器 */
  source?: ProcessEventSource
  /** 默认真的退出进程；测试注入记录器 */
  exit?: (code: number) => void
}

const SIGNALS = ['SIGINT', 'SIGTERM'] as const

function reasonOf(value: unknown): string {
  if (value instanceof Error) return value.message || value.name
  if (typeof value === 'string') return value
  return String(value)
}

/**
 * 进程级兜底与优雅停机：
 *
 * - `SIGINT` / `SIGTERM`：先关服务（刷掉攒着的消息、停调度器、关数据库）再退出，
 *   日志留一行「已停止（耗时）」。容器停容器时不会再有半途丢消息的情况。
 * - 未捕获异常：此时进程状态已不可信，记 fatal、尽力关闭并以 1 退出，交给容器重启。
 * - 未处理的异步失败：记 error 但**不退出**——多半是某个调用忘了 catch，
 *   不该为它把整个服务拉下来（重启期间界面是不可用的），记清楚就够了。
 */
export function registerProcessGuards(options: ProcessGuardOptions): void {
  const { app } = options
  const source = options.source ?? process
  const exit = options.exit ?? ((code: number) => process.exit(code))
  let closing = false

  async function shutdown(line: string, code: number): Promise<void> {
    if (closing) return
    closing = true
    const startedAt = Date.now()
    try {
      await app.close()
    } catch (error) {
      app.log.error({ err: error }, '停止时出错，仍继续退出')
    }
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
    app.log.info(`${line}，已停止，耗时 ${seconds} 秒`)
    exit(code)
  }

  for (const signal of SIGNALS) {
    source.on(signal, () => {
      void shutdown(`收到 ${signal}`, 0)
    })
  }

  source.on('uncaughtException', (error: unknown) => {
    app.log.fatal({ err: error }, `未捕获的异常，进程将退出：${reasonOf(error)}`)
    void shutdown('遇到未捕获的异常', 1)
  })

  source.on('unhandledRejection', (reason: unknown) => {
    app.log.error({ err: reason }, `未处理的异步失败（已忽略，服务继续）：${reasonOf(reason)}`)
  })
}
