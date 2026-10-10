/**
 * 启动阶段的固定几行输出。
 *
 * 只负责拼字符串（不读文件、不查目录），这样每条都能单独测；真实事实由 index.ts 采集。
 * 形状：横幅一行，然后四步各一行，最后就绪行带总耗时。
 */
export interface StartupFacts {
  /** 服务自己的版本号，如 1.1.0 */
  version: string
  /** 运行时版本，如 v24.12.0 */
  node: string
  host: string
  port: number
  dbPath: string
  /** 库本来就存在（true），还是这次新建的（false） */
  dbExisted: boolean
  /** 界面产物是否已就绪 */
  staticReady: boolean
  staticDir?: string
}

export function startupLines(facts: StartupFacts): string[] {
  return [
    `Kestrel Radar 启动，版本 ${facts.version}，node ${facts.node}`,
    `[1/4] 读取配置：完成，端口 ${facts.port}，数据库 ${facts.dbPath}`,
    `[2/4] 打开数据库：完成，${facts.dbExisted ? '沿用已有库' : '首次创建'}`,
    facts.staticReady && facts.staticDir
      ? `[3/4] 挂载界面产物：完成，${facts.staticDir}`
      : '[3/4] 挂载界面产物：跳过，没有构建产物，本次只提供 API',
  ]
}

export function readyLine(facts: StartupFacts, seconds: number): string {
  const shape = facts.staticReady ? '界面 + API' : '仅 API'
  return `[4/4] 服务就绪：${shape}，http://${facts.host}:${facts.port}，启动耗时 ${seconds.toFixed(1)} 秒`
}
