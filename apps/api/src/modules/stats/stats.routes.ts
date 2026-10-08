import type { FastifyInstance } from 'fastify'

import type { StatsService } from './stats.service.ts'

/** 仪表盘汇总：一次拿齐四张数量卡、今日事件、今日投递、采集成功率与 RSSHub 状态 */
export function registerStatsRoutes(app: FastifyInstance, service: StatsService): void {
  app.get('/stats/overview', async () => service.overview())
  // 卡片背面的按对象汇总：配置页三列卡片一次拿齐
  app.get('/stats/cards', async () => service.cardStats())
}
