import type { FastifyBaseLogger } from 'fastify'

/**
 * 后台循环的统一入口：一轮失败只记一条警告，下一轮照常跑，绝不把进程带走。
 *
 * 用在「自己跑自己的」活儿上——定时清理、归档这类，失败不该影响服务可用性，
 * 也不该因为一次数据库被锁就整个进程退出。
 */
export async function runSafely(
  what: string,
  work: () => void | Promise<void>,
  log: FastifyBaseLogger,
): Promise<boolean> {
  try {
    await work()
    return true
  } catch (error) {
    log.warn({ err: error }, `${what} 失败，本轮跳过，下一轮照常重试`)
    return false
  }
}
