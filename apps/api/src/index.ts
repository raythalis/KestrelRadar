import { existsSync, readFileSync } from 'node:fs'

import { buildApp } from './app.ts'
import { loadConfig } from './config/index.ts'
import { registerProcessGuards } from './process-guards.ts'
import { readyLine, startupLines, type StartupFacts } from './startup.ts'

const startedAt = Date.now()

/** 服务自己的版本号：读本包 package.json；读不到就写 unknown，不因为一行横幅启动失败 */
function ownVersion(): string {
  try {
    const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const version = (parsed as { version?: unknown }).version
      if (typeof version === 'string' && version) return version
    }
  } catch {
    // 读不到不影响启动
  }
  return 'unknown'
}

const config = loadConfig()
const staticReady = Boolean(config.staticDir && existsSync(config.staticDir))
const facts: StartupFacts = {
  version: ownVersion(),
  node: process.version.replace(/^v/, ''),
  host: config.host,
  port: config.port,
  dbPath: config.dbPath,
  dbExisted: config.dbPath !== ':memory:' && existsSync(config.dbPath),
  staticReady,
  ...(config.staticDir ? { staticDir: config.staticDir } : {}),
}

const app = await buildApp({
  dbPath: config.dbPath,
  logger: config.logger,
  ...(config.staticDir ? { staticDir: config.staticDir } : {}),
})

// 优雅停机 + 进程级兜底：停机信号、未捕获异常、未处理的异步失败都在这里收口
registerProcessGuards({ app })

// 启动说明：横幅 + 四步，最后一行就绪带总耗时（见 .ai/plans/log-and-startup-style.md）
for (const line of startupLines(facts)) app.log.info(line)

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info(readyLine(facts, (Date.now() - startedAt) / 1000))
} catch (error) {
  app.log.error(
    { err: error },
    `启动失败：端口 ${config.port} 没能监听，检查端口是否被占用，或用 KESTREL_PORT 换一个`,
  )
  process.exit(1)
}
