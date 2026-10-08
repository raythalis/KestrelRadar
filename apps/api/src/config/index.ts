import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** 前端构建产物的默认位置（apps/web/dist）：按模块定位，跟当前工作目录无关 */
const DEFAULT_STATIC_DIR = fileURLToPath(new URL('../../../web/dist', import.meta.url))

/** 启动配置：环境变量一律 KESTREL_ 前缀 */
export interface AppConfig {
  dbPath: string
  host: string
  port: number
  logger: boolean
  /** 静态托管的目录；没给、也没有构建产物时为 undefined（只提供 API） */
  staticDir?: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const explicitStaticDir = env.KESTREL_STATIC_DIR?.trim()
  const staticDir =
    explicitStaticDir || (existsSync(DEFAULT_STATIC_DIR) ? DEFAULT_STATIC_DIR : undefined)
  return {
    dbPath: env.KESTREL_DB_PATH ?? 'data/kestrel.db',
    host: env.KESTREL_HOST ?? '127.0.0.1',
    port: Number(env.KESTREL_PORT ?? 8765),
    logger: env.KESTREL_LOG !== 'off',
    ...(staticDir ? { staticDir } : {}),
  }
}
