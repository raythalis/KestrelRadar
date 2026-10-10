import { createRequire } from 'node:module'

import { LogController, type FastifyServerOptions } from 'fastify'

/** 传给 Fastify 的 logger 配置：对象即 pino 配置，false 表示不打日志 */
export type LoggerOption = FastifyServerOptions['logger']

const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const

/**
 * Fastify 自己那行英文的「Server listening at ...」：我们的 [4/4] 就绪行已经说清楚了，
 * 留着只会一行变两行。文本匹配够用——真要改文案，最多是多出一行英文，不影响功能。
 */
const SILENT_FASTIFY_LINES = ['Server listening at']

/**
 * 关掉 Fastify 自带的请求日志（incoming request / request completed）：
 * 请求行自己打（见 plugins/request-log.ts），更短、能跳过健康检查、带错误码。
 * 用新的 logController——顶层的 `disableRequestLogging` 已标记弃用，fastify@6 会删掉。
 * 类型上写的是「类」，运行时要的是实例，这里按运行时来。
 */
export function quietLogController(): FastifyServerOptions['logController'] {
  return new LogController({
    disableRequestLogging: true,
  }) as unknown as FastifyServerOptions['logController']
}

const require = createRequire(import.meta.url)

/**
 * 找 pino-pretty 的绝对路径。
 *
 * pino 默认按「调用它的那个文件所在目录」去找格式化器，目录一变（容器里工作目录是仓库根、
 * 而依赖装在 apps/api/node_modules 下）就可能找不到。自己解析成绝对路径，跟工作目录无关。
 */
function prettyTarget(): string | undefined {
  try {
    return require.resolve('pino-pretty')
  } catch {
    return undefined
  }
}

/**
 * 运行期日志：pino + pino-pretty，一行一条给人看。
 *
 * 约定（见 `.ai/plans/log-and-startup-style.md`）：
 * - **级别名放行首**，Dozzle 才认得出级别、能按级别筛选（Pino 默认的数字级别它认不出来）
 * - 单行、本地时间带毫秒，消息里带的字段（请求 id、任务 id 之类）照旧跟在后面，方便搜
 * - 颜色默认**开**（容器里 Dozzle 会渲染 ANSI，看着清楚），`KESTREL_LOG_COLOR=0` 关掉
 * - `KESTREL_LOG=off` 彻底关日志，`KESTREL_LOG_LEVEL` 调级别（默认 info）
 *
 * 万一定位不到格式化器就退回 pino 默认的 JSON：宁可日志不好看，也不能让服务起不来。
 *
 * 代价：输出不再是 JSON，按字段做机器解析变难——这条是已知并接受的取舍。
 */
export function loggerOptions(env: NodeJS.ProcessEnv = process.env): LoggerOption {
  if (env.KESTREL_LOG === 'off') return false

  const requested = env.KESTREL_LOG_LEVEL?.trim()
  const level = LEVELS.find((item) => item === requested) ?? 'info'

  const target = prettyTarget()
  if (!target) return { level }

  return {
    level,
    hooks: {
      logMethod(args, method) {
        const [first] = args
        if (
          typeof first === 'string' &&
          SILENT_FASTIFY_LINES.some((prefix) => first.startsWith(prefix))
        ) {
          return
        }
        method.apply(this, args)
      },
    },
    transport: {
      target,
      options: {
        colorize: env.KESTREL_LOG_COLOR !== '0',
        levelFirst: true,
        singleLine: true,
        // 注意：不要用 hideObject 去藏行尾字段——pino-pretty 13.2.0 里它会把行尾换行
        // 一起吃掉，整个日志挤成一行（实测）。行干净靠「不传附加字段」，见 request-log.ts。
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }
}
