/** 启动配置：环境变量一律 KESTREL_ 前缀 */
export interface AppConfig {
  dbPath: string
  host: string
  port: number
  logger: boolean
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    dbPath: env.KESTREL_DB_PATH ?? 'data/kestrel.db',
    host: env.KESTREL_HOST ?? '127.0.0.1',
    port: Number(env.KESTREL_PORT ?? 8765),
    logger: env.KESTREL_LOG !== 'off',
  }
}
